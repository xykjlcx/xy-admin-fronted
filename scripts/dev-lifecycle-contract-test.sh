#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_DEV_SCRIPT="$ROOT_DIR/scripts/dev.sh"
SOURCE_ENV_EXAMPLE="$ROOT_DIR/backend/.env.example"
SOURCE_COMPOSE_FILE="$ROOT_DIR/compose.dev.yml"
REAL_NODE="$(command -v node)"
REAL_CURL="$(command -v curl)"
TMP_BASE="$(cd "$(mktemp -d)" && pwd -P)"

cleanup_all() {
  rm -R "$TMP_BASE"
}
trap cleanup_all EXIT

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

wait_for_url() {
  local url="$1"
  local attempt=0
  while [[ "$attempt" -lt 50 ]]; do
    if "$REAL_CURL" -fsS "$url" >/dev/null 2>&1; then
      return
    fi
    sleep 0.1
    attempt=$((attempt + 1))
  done
  fail "timed out waiting for $url"
}

create_fake_project() {
  local name="$1"
  local project="$TMP_BASE/$name"

  mkdir -p \
    "$project/scripts" \
    "$project/backend/app/target" \
    "$project/node_modules/.bin" \
    "$project/test-bin" \
    "$project/test-fixtures" \
    "$project/outside"
  cp "$SOURCE_DEV_SCRIPT" "$project/scripts/dev.sh"
  cp "$SOURCE_ENV_EXAMPLE" "$project/backend/.env.example"
  cp "$SOURCE_COMPOSE_FILE" "$project/compose.dev.yml"
  chmod +x "$project/scripts/dev.sh"

  printf '%s\n' \
    "const http = require('http');" \
    "const port = Number(process.argv[2]);" \
    "const server = http.createServer((_request, response) => {" \
    "  response.writeHead(200, {'Content-Type': 'application/json'});" \
    "  response.end(JSON.stringify({status: 'UP'}));" \
    "});" \
    "server.listen(port, '127.0.0.1');" \
    "process.on('SIGTERM', () => server.close(() => process.exit(0)));" \
    >"$project/test-fixtures/server.cjs"

  printf '%s\n' \
    '#!/usr/bin/env node' \
    "const http = require('http');" \
    "const server = http.createServer((_request, response) => response.end('vite'));" \
    "server.listen(5173, '127.0.0.1');" \
    "process.on('SIGTERM', () => server.close(() => process.exit(0)));" \
    >"$project/node_modules/.bin/vite"
  chmod +x "$project/node_modules/.bin/vite"

  printf '%s\n' \
    '#!/usr/bin/env bash' \
    'set -euo pipefail' \
    'mkdir -p "$(cd "$(dirname "$0")" && pwd)/app/target"' \
    ': >"$(cd "$(dirname "$0")" && pwd)/app/target/metabuilder-app-0.1.0-SNAPSHOT.jar"' \
    >"$project/backend/mvnw"
  chmod +x "$project/backend/mvnw"

  printf '%s\n' \
    '#!/usr/bin/env bash' \
    'set -euo pipefail' \
    'printf "%s\n" "$*" >>"$FAKE_DOCKER_LOG"' \
    'case " $* " in' \
    '  *" up "*)' \
    '    if [[ "${FAKE_DOCKER_UP_FAIL:-0}" == "1" ]]; then exit 42; fi' \
    '    printf "running\n" >"$FAKE_DOCKER_STATE"' \
    '    ;;' \
    '  *" down "*)' \
    '    rm -f "$FAKE_DOCKER_STATE"' \
    '    ;;' \
    '  *" ps -a -q "*)' \
    '    if [[ -f "$FAKE_DOCKER_STATE" ]]; then printf "container-id\n"; fi' \
    '    ;;' \
    '  *" ps "*" postgres "*)' \
    '    if [[ -f "$FAKE_DOCKER_STATE" ]]; then printf "{\"Service\":\"postgres\",\"State\":\"running\",\"Health\":\"%s\"}\n" "${FAKE_POSTGRES_HEALTH:-healthy}"; fi' \
    '    ;;' \
    '  *" ps "*" redis "*)' \
    '    if [[ -f "$FAKE_DOCKER_STATE" ]]; then printf "{\"Service\":\"redis\",\"State\":\"running\",\"Health\":\"%s\"}\n" "${FAKE_REDIS_HEALTH:-healthy}"; fi' \
    '    ;;' \
    'esac' \
    >"$project/test-bin/docker"
  chmod +x "$project/test-bin/docker"

  printf '%s\n' \
    '#!/usr/bin/env bash' \
    'set -euo pipefail' \
    'printf "%s\n" "$*" >>"$FAKE_CURL_LOG"' \
    'exec "$REAL_CURL" "$@"' \
    >"$project/test-bin/curl"
  chmod +x "$project/test-bin/curl"

  printf '%s\n' \
    '#!/usr/bin/env bash' \
    'set -euo pipefail' \
    'if [[ "${1:-}" == "-version" ]]; then' \
    '  printf "openjdk version \04221.0.10\042\n" >&2' \
    '  exit 0' \
    'fi' \
    'if [[ "${FAKE_JAVA_MODE:-managed}" == "foreign-listener" ]]; then' \
    '  (' \
    '    sleep 0.2' \
    '    cd "$FAKE_FOREIGN_CWD"' \
    '    exec "$REAL_NODE" "$FAKE_SERVER_JS" 8080' \
    '  ) &' \
    '  printf "%s\\n" "$!" >"$FAKE_FOREIGN_PID_FILE"' \
    '  sleep 60' \
    'fi' \
    'exec "$REAL_NODE" "$FAKE_SERVER_JS" 8080 "${2:-metabuilder-app-test.jar}"' \
    >"$project/test-bin/java"
  chmod +x "$project/test-bin/java"

  printf '%s\n' "$project"
}

run_dev() {
  local project="$1"
  shift
  PATH="$project/test-bin:$PATH" \
    REAL_CURL="$REAL_CURL" \
    REAL_NODE="$REAL_NODE" \
    FAKE_DOCKER_LOG="$project/docker.log" \
    FAKE_DOCKER_STATE="$project/docker.state" \
    FAKE_CURL_LOG="$project/curl.log" \
    FAKE_SERVER_JS="$project/test-fixtures/server.cjs" \
    FAKE_FOREIGN_CWD="$project/outside" \
    FAKE_FOREIGN_PID_FILE="$project/foreign.pid" \
    "$project/scripts/dev.sh" "$@"
}

stop_test_project() {
  local project="$1"
  run_dev "$project" stop >/dev/null 2>&1 || true
  if [[ -f "$project/foreign.pid" ]]; then
    local foreign_pid
    foreign_pid="$(sed -n '1p' "$project/foreign.pid")"
    if kill -0 "$foreign_pid" 2>/dev/null; then
      kill "$foreign_pid" 2>/dev/null || true
      wait "$foreign_pid" 2>/dev/null || true
    fi
  fi
}

case_foreign_port() {
  local project foreign_pid="" output=""
  project="$(create_fake_project foreign-port)"

  (cd "$project/outside" && exec "$REAL_NODE" "$project/test-fixtures/server.cjs" 8080) &
  foreign_pid=$!
  trap "stop_test_project '$project'; if kill -0 '$foreign_pid' 2>/dev/null; then kill '$foreign_pid'; wait '$foreign_pid' 2>/dev/null || true; fi" EXIT
  wait_for_url "http://127.0.0.1:8080"

  if output="$(run_dev "$project" start 2>&1)"; then
    fail "start accepted a foreign listener on port 8080"
  fi
  [[ "$output" == *"port 8080 is occupied by a foreign process"* ]] ||
    fail "start failed for the wrong reason instead of rejecting the foreign port: $output"
  kill -0 "$foreign_pid" 2>/dev/null || fail "start cleanup killed the foreign listener"
  if [[ -f "$project/docker.log" ]] && grep -Fq ' down ' "$project/docker.log"; then
    fail "preflight failure removed compose resources that were not created by this start attempt"
  fi
}

case_false_ready() {
  local project output=""
  project="$(create_fake_project false-ready)"
  trap "stop_test_project '$project'" EXIT

  if output="$(FAKE_JAVA_MODE=foreign-listener run_dev "$project" start 2>&1)"; then
    fail "start accepted health served by a listener other than the managed backend pid"
  fi
  [[ "$output" == *"port 8080 listener does not belong to managed backend"* ]] ||
    fail "false-ready check failed for the wrong reason: $output"
}

case_compose_cleanup() {
  local project
  project="$(create_fake_project compose-cleanup)"
  trap "stop_test_project '$project'" EXIT

  if FAKE_DOCKER_UP_FAIL=1 run_dev "$project" start >/dev/null 2>&1; then
    fail "start unexpectedly succeeded after compose up failed"
  fi
  grep -Fq 'down --remove-orphans' "$project/docker.log" ||
    fail "compose up failure did not call down --remove-orphans"
}

case_readiness_and_idempotence() {
  local project backend_pid frontend_pid
  project="$(create_fake_project readiness)"
  trap "stop_test_project '$project'" EXIT

  run_dev "$project" start >/dev/null
  backend_pid="$(sed -n '1p' "$project/.metabuilder-dev/backend.pid")"
  frontend_pid="$(sed -n '1p' "$project/.metabuilder-dev/frontend.pid")"
  run_dev "$project" start >/dev/null
  [[ "$backend_pid" == "$(sed -n '1p' "$project/.metabuilder-dev/backend.pid")" ]] ||
    fail "repeated start changed the backend pid"
  [[ "$frontend_pid" == "$(sed -n '1p' "$project/.metabuilder-dev/frontend.pid")" ]] ||
    fail "repeated start changed the frontend pid"
  grep -Fq '/actuator/health/liveness' "$project/curl.log" || fail "start did not wait for liveness"
  grep -Fq '/actuator/health/readiness' "$project/curl.log" || fail "start did not wait for readiness"

  run_dev "$project" stop >/dev/null
  if lsof -nP -iTCP:8080 -sTCP:LISTEN >/dev/null 2>&1; then fail "stop left port 8080 occupied"; fi
  if lsof -nP -iTCP:5173 -sTCP:LISTEN >/dev/null 2>&1; then fail "stop left port 5173 occupied"; fi
}

case_status_dependencies() {
  local project degraded healthy
  project="$(create_fake_project status)"
  cp "$project/backend/.env.example" "$project/backend/.env"
  printf 'running\n' >"$project/docker.state"

  degraded="$(FAKE_POSTGRES_HEALTH=healthy FAKE_REDIS_HEALTH=unhealthy run_dev "$project" status)"
  [[ "$degraded" == *"postgres: healthy"* ]] || fail "status did not report PostgreSQL health: $degraded"
  [[ "$degraded" == *"redis: unhealthy"* ]] || fail "status did not report Redis health: $degraded"
  [[ "$degraded" == *"dependencies: degraded"* ]] || fail "status hid a partially unhealthy dependency set"

  healthy="$(FAKE_POSTGRES_HEALTH=healthy FAKE_REDIS_HEALTH=healthy run_dev "$project" status)"
  [[ "$healthy" == *"dependencies: healthy"* ]] || fail "status did not require both dependencies healthy"
}

case_repeated_start_failure_preserves_stack() {
  local project backend_pid frontend_pid output
  project="$(create_fake_project repeated-start-failure)"
  trap "stop_test_project '$project'" EXIT

  run_dev "$project" start >/dev/null
  backend_pid="$(sed -n '1p' "$project/.metabuilder-dev/backend.pid")"
  frontend_pid="$(sed -n '1p' "$project/.metabuilder-dev/frontend.pid")"

  if output="$(FAKE_DOCKER_UP_FAIL=1 run_dev "$project" start 2>&1)"; then
    fail "repeated start unexpectedly succeeded after compose failed"
  fi
  [[ "$output" != *"MetaBuilder development services are ready"* ]] ||
    fail "repeated start reported readiness after compose failed"
  kill -0 "$backend_pid" 2>/dev/null || fail "repeated start failure killed the original backend"
  kill -0 "$frontend_pid" 2>/dev/null || fail "repeated start failure killed the original frontend"
  if grep -Fq ' down ' "$project/docker.log"; then
    fail "repeated start failure removed the pre-existing compose stack"
  fi

  output="$(run_dev "$project" status)"
  [[ "$output" == *"backend: running (pid $backend_pid)"* ]] ||
    fail "original backend was not healthy after repeated start failure: $output"
  [[ "$output" == *"frontend: running (pid $frontend_pid)"* ]] ||
    fail "original frontend was not healthy after repeated start failure: $output"
  [[ "$output" == *"dependencies: healthy"* ]] ||
    fail "original compose dependencies were not healthy after repeated start failure: $output"
}

case_project_names() {
  local first second first_name second_name
  first="$(create_fake_project clone-a)"
  second="$(create_fake_project clone-b)"
  cp "$first/backend/.env.example" "$first/backend/.env"
  cp "$second/backend/.env.example" "$second/backend/.env"

  run_dev "$first" status >/dev/null
  run_dev "$second" status >/dev/null
  first_name="$(sed -n 's/.*--project-name \([^ ]*\).*/\1/p' "$first/docker.log" | head -n 1)"
  second_name="$(sed -n 's/.*--project-name \([^ ]*\).*/\1/p' "$second/docker.log" | head -n 1)"
  [[ "$first_name" =~ ^metabuilder-dev-[a-f0-9]{12}$ ]] || fail "compose project name is not stable and legal: $first_name"
  [[ "$second_name" =~ ^metabuilder-dev-[a-f0-9]{12}$ ]] || fail "compose project name is not stable and legal: $second_name"
  [[ "$first_name" != "$second_name" ]] || fail "different repository paths share a compose project name"
}

run_case() {
  local name="$1"
  case "$name" in
    foreign-port) (case_foreign_port) ;;
    false-ready) (case_false_ready) ;;
    compose-cleanup) (case_compose_cleanup) ;;
    readiness) (case_readiness_and_idempotence) ;;
    status) (case_status_dependencies) ;;
    project-name) (case_project_names) ;;
    repeated-start-failure) (case_repeated_start_failure_preserves_stack) ;;
    *) fail "unknown lifecycle contract case: $name" ;;
  esac
  printf 'dev lifecycle contract %s: PASS\n' "$name"
}

if [[ "$#" -eq 1 ]]; then
  run_case "$1"
else
  for test_case in foreign-port false-ready compose-cleanup readiness status project-name repeated-start-failure; do
    run_case "$test_case"
  done
fi
