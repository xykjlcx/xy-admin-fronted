#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
RUNTIME_DIR="$ROOT_DIR/.metabuilder-dev"
ENV_FILE="$BACKEND_DIR/.env"
ENV_EXAMPLE="$BACKEND_DIR/.env.example"
COMPOSE_FILE="$ROOT_DIR/compose.dev.yml"
BACKEND_PID_FILE="$RUNTIME_DIR/backend.pid"
FRONTEND_PID_FILE="$RUNTIME_DIR/frontend.pid"
BACKEND_LOG="$RUNTIME_DIR/backend.log"
FRONTEND_LOG="$RUNTIME_DIR/frontend.log"
BACKEND_PORT=8080
FRONTEND_PORT=5173
JAVA_BIN=""
BACKEND_STARTED_THIS_RUN=0
FRONTEND_STARTED_THIS_RUN=0
COMPOSE_STARTED_THIS_RUN=0

usage() {
  printf 'Usage: %s {start|stop|status}\n' "$0" >&2
  exit 64
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || {
    printf 'Missing required command: %s\n' "$1" >&2
    return 1
  }
}

read_pid() {
  local pid_file="$1"
  local pid=""
  [[ -f "$pid_file" ]] || return 1
  IFS= read -r pid <"$pid_file" || return 1
  [[ "$pid" =~ ^[0-9]+$ ]] || return 1
  printf '%s\n' "$pid"
}

process_cwd() {
  local pid="$1"
  local cwd=""

  if [[ -L "/proc/$pid/cwd" ]]; then
    readlink "/proc/$pid/cwd"
    return
  fi

  if command -v lsof >/dev/null 2>&1; then
    cwd="$(lsof -a -p "$pid" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p' | head -n 1)"
  fi
  printf '%s\n' "$cwd"
}

process_command() {
  ps -p "$1" -o command= 2>/dev/null || true
}

listener_pids() {
  local port="$1"
  { lsof -t -nP -iTCP:"$port" -sTCP:LISTEN 2>/dev/null || true; } | sort -u
}

pid_listens_on_port() {
  local pid="$1"
  local port="$2"
  local listeners
  listeners="$(listener_pids "$port")"
  [[ "$listeners" == "$pid" ]]
}

process_belongs_to_repo() {
  local pid="$1"
  local role="$2"
  local expected_cwd marker actual_cwd actual_command

  kill -0 "$pid" 2>/dev/null || return 1
  case "$role" in
    backend)
      expected_cwd="$BACKEND_DIR"
      marker="metabuilder-app-"
      ;;
    frontend)
      expected_cwd="$ROOT_DIR"
      marker="vite"
      ;;
    *)
      return 1
      ;;
  esac

  actual_cwd="$(process_cwd "$pid")"
  actual_command="$(process_command "$pid")"
  [[ "$actual_cwd" == "$expected_cwd" && "$actual_command" == *"$marker"* ]]
}

process_status() {
  local pid_file="$1"
  local role="$2"
  local port="$3"
  local pid=""

  if ! pid="$(read_pid "$pid_file")"; then
    printf 'stopped'
    return
  fi
  if process_belongs_to_repo "$pid" "$role" && pid_listens_on_port "$pid" "$port"; then
    printf 'running (pid %s)' "$pid"
  elif process_belongs_to_repo "$pid" "$role"; then
    printf 'not listening (pid %s)' "$pid"
  elif kill -0 "$pid" 2>/dev/null; then
    printf 'foreign process refused (pid %s)' "$pid"
  else
    printf 'stale pid (pid %s)' "$pid"
  fi
}

ensure_port_available_or_managed() {
  local port="$1"
  local pid_file="$2"
  local role="$3"
  local listeners pid=""
  listeners="$(listener_pids "$port")"
  [[ -z "$listeners" ]] && return

  if pid="$(read_pid "$pid_file")" &&
      process_belongs_to_repo "$pid" "$role" &&
      [[ "$listeners" == "$pid" ]]; then
    return
  fi
  printf 'Cannot start: port %s is occupied by a foreign process (listener pid: %s)\n' \
    "$port" "$(printf '%s' "$listeners" | tr '\n' ',')" >&2
  return 1
}

generate_local_env() {
  local password secret temporary

  [[ -f "$ENV_EXAMPLE" ]] || {
    printf 'Missing environment template: %s\n' "$ENV_EXAMPLE" >&2
    return 1
  }
  require_command openssl
  mkdir -p "$RUNTIME_DIR"
  [[ -f "$ENV_FILE" ]] || cp "$ENV_EXAMPLE" "$ENV_FILE"

  if grep -Eq '^(DB_PASSWORD|METABUILDER_AUTH_TOKEN_SECRET)=__GENERATED__$' "$ENV_FILE"; then
    password="$(openssl rand -hex 24)"
    secret="$(openssl rand -hex 32)"
    temporary="$RUNTIME_DIR/env.tmp"
    awk -v password="$password" -v secret="$secret" '
      /^DB_PASSWORD=__GENERATED__$/ { print "DB_PASSWORD=" password; next }
      /^METABUILDER_AUTH_TOKEN_SECRET=__GENERATED__$/ {
        print "METABUILDER_AUTH_TOKEN_SECRET=" secret; next
      }
      { print }
    ' "$ENV_FILE" >"$temporary"
    mv "$temporary" "$ENV_FILE"
  fi
  chmod 600 "$ENV_FILE"
}

load_local_env() {
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a

  : "${DB_URL:?DB_URL is required}"
  : "${DB_USERNAME:?DB_USERNAME is required}"
  : "${DB_PASSWORD:?DB_PASSWORD is required}"
  : "${REDIS_HOST:?REDIS_HOST is required}"
  : "${REDIS_PORT:?REDIS_PORT is required}"
  : "${METABUILDER_AUTH_TOKEN_SECRET:?METABUILDER_AUTH_TOKEN_SECRET is required}"
  if [[ "$DB_PASSWORD" == "__GENERATED__" || "$METABUILDER_AUTH_TOKEN_SECRET" == "__GENERATED__" ]]; then
    printf 'Generated placeholders are not valid runtime credentials\n' >&2
    return 1
  fi
}

repository_path_hash() {
  if command -v shasum >/dev/null 2>&1; then
    printf '%s' "$ROOT_DIR" | shasum -a 256 | awk '{print substr($1, 1, 12)}'
  elif command -v sha256sum >/dev/null 2>&1; then
    printf '%s' "$ROOT_DIR" | sha256sum | awk '{print substr($1, 1, 12)}'
  else
    printf '%s' "$ROOT_DIR" | openssl dgst -sha256 | awk '{print substr($NF, 1, 12)}'
  fi
}

compose_project_name() {
  printf 'metabuilder-dev-%s\n' "$(repository_path_hash)"
}

compose() {
  docker compose \
    --project-name "$(compose_project_name)" \
    --env-file "$ENV_FILE" \
    -f "$COMPOSE_FILE" \
    "$@"
}

java_major_version() {
  "$1" -version 2>&1 | sed -n '1s/.*version "\([0-9][0-9]*\).*/\1/p'
}

resolve_java_21() {
  local candidate=""

  if command -v java >/dev/null 2>&1 && [[ "$(java_major_version "$(command -v java)")" == "21" ]]; then
    JAVA_BIN="$(command -v java)"
  else
    for candidate in \
      /opt/homebrew/opt/openjdk@21/bin/java \
      /usr/local/opt/openjdk@21/bin/java \
      "$HOME/.sdkman/candidates/java/21/bin/java"; do
      if [[ -x "$candidate" && "$(java_major_version "$candidate")" == "21" ]]; then
        JAVA_BIN="$candidate"
        break
      fi
    done
  fi

  [[ -n "$JAVA_BIN" ]] || {
    printf 'Java 21 is required; no Java 21 runtime was found\n' >&2
    return 1
  }
  export JAVA_HOME="$(cd "$(dirname "$JAVA_BIN")/.." && pwd)"
  export PATH="$JAVA_HOME/bin:$PATH"
}

find_backend_jar() {
  find "$BACKEND_DIR/app/target" -maxdepth 1 -type f -name 'metabuilder-app-*.jar' ! -name '*.original' -print 2>/dev/null | sort | tail -n 1
}

package_backend() {
  resolve_java_21
  "$BACKEND_DIR/mvnw" -q -f "$BACKEND_DIR/pom.xml" -pl app -am -DskipTests package
}

ensure_frontend_dependencies() {
  if [[ ! -x "$ROOT_DIR/node_modules/.bin/vite" ]]; then
    require_command pnpm
    (cd "$ROOT_DIR" && pnpm install --frozen-lockfile)
  fi
}

start_backend() {
  local pid="" jar=""

  if pid="$(read_pid "$BACKEND_PID_FILE")" && process_belongs_to_repo "$pid" backend; then
    printf 'backend already running (pid %s)\n' "$pid"
    return
  fi

  package_backend
  jar="$(find_backend_jar)"
  [[ -n "$jar" ]] || {
    printf 'Backend executable jar was not produced\n' >&2
    return 1
  }

  (
    cd "$BACKEND_DIR"
    nohup "$JAVA_BIN" -jar "$jar" >"$BACKEND_LOG" 2>&1 </dev/null &
    printf '%s\n' "$!" >"$BACKEND_PID_FILE"
  )
  BACKEND_STARTED_THIS_RUN=1
}

start_frontend() {
  local pid=""

  if pid="$(read_pid "$FRONTEND_PID_FILE")" && process_belongs_to_repo "$pid" frontend; then
    printf 'frontend already running (pid %s)\n' "$pid"
    return
  fi

  ensure_frontend_dependencies
  (
    cd "$ROOT_DIR"
    nohup "$ROOT_DIR/node_modules/.bin/vite" --host 127.0.0.1 --port 5173 --strictPort >"$FRONTEND_LOG" 2>&1 </dev/null &
    printf '%s\n' "$!" >"$FRONTEND_PID_FILE"
  )
  FRONTEND_STARTED_THIS_RUN=1
}

wait_for_url() {
  local label="$1"
  local url="$2"
  local pid_file="$3"
  local role="$4"
  local port="$5"
  local pid="" attempt=0

  while [[ "$attempt" -lt 120 ]]; do
    if ! pid="$(read_pid "$pid_file")" || ! process_belongs_to_repo "$pid" "$role"; then
      printf '%s stopped before becoming ready\n' "$label" >&2
      return 1
    fi
    if curl -fsS "$url" >/dev/null 2>&1; then
      if pid_listens_on_port "$pid" "$port"; then
        return
      fi
      printf 'Cannot mark %s ready: port %s listener does not belong to managed %s pid %s\n' \
        "$label" "$port" "$role" "$pid" >&2
      return 1
    fi
    sleep 1
    attempt=$((attempt + 1))
  done

  printf 'Timed out waiting for %s at %s\n' "$label" "$url" >&2
  return 1
}

cleanup_start_failure() {
  if [[ "$FRONTEND_STARTED_THIS_RUN" -eq 1 ]]; then
    stop_process "$FRONTEND_PID_FILE" frontend
  fi
  if [[ "$BACKEND_STARTED_THIS_RUN" -eq 1 ]]; then
    stop_process "$BACKEND_PID_FILE" backend
  fi
  if [[ "$COMPOSE_STARTED_THIS_RUN" -eq 1 && -f "$ENV_FILE" ]] &&
      command -v docker >/dev/null 2>&1; then
    compose down --remove-orphans >/dev/null 2>&1 || true
  fi
}

stop_process() {
  local pid_file="$1"
  local role="$2"
  local pid="" attempt=0

  if ! pid="$(read_pid "$pid_file")"; then
    rm -f "$pid_file"
    return
  fi
  if ! process_belongs_to_repo "$pid" "$role"; then
    if kill -0 "$pid" 2>/dev/null; then
      printf 'Refusing to stop foreign %s pid %s\n' "$role" "$pid" >&2
    fi
    rm -f "$pid_file"
    return
  fi

  kill "$pid"
  while kill -0 "$pid" 2>/dev/null && [[ "$attempt" -lt 100 ]]; do
    sleep 0.1
    attempt=$((attempt + 1))
  done
  if process_belongs_to_repo "$pid" "$role"; then
    kill -KILL "$pid"
  fi
  rm -f "$pid_file"
}

start_all() {
  BACKEND_STARTED_THIS_RUN=0
  FRONTEND_STARTED_THIS_RUN=0
  COMPOSE_STARTED_THIS_RUN=0

  if ! require_command docker || ! require_command curl || ! require_command lsof; then
    cleanup_start_failure
    return 1
  fi
  if ! generate_local_env || ! load_local_env; then
    cleanup_start_failure
    return 1
  fi
  mkdir -p "$RUNTIME_DIR"

  if ! ensure_port_available_or_managed "$BACKEND_PORT" "$BACKEND_PID_FILE" backend ||
      ! ensure_port_available_or_managed "$FRONTEND_PORT" "$FRONTEND_PID_FILE" frontend; then
    cleanup_start_failure
    return 1
  fi
  COMPOSE_STARTED_THIS_RUN=1
  if ! compose up -d --wait --wait-timeout 90; then
    cleanup_start_failure
    return 1
  fi
  if ! start_backend; then
    cleanup_start_failure
    return 1
  fi
  if ! wait_for_url backend-liveness \
      "http://127.0.0.1:${BACKEND_PORT}/actuator/health/liveness" \
      "$BACKEND_PID_FILE" backend "$BACKEND_PORT"; then
    tail -n 80 "$BACKEND_LOG" >&2 || true
    cleanup_start_failure
    return 1
  fi
  if ! wait_for_url backend-readiness \
      "http://127.0.0.1:${BACKEND_PORT}/actuator/health/readiness" \
      "$BACKEND_PID_FILE" backend "$BACKEND_PORT"; then
    tail -n 80 "$BACKEND_LOG" >&2 || true
    cleanup_start_failure
    return 1
  fi
  if ! start_frontend; then
    cleanup_start_failure
    return 1
  fi
  if ! wait_for_url frontend "http://127.0.0.1:${FRONTEND_PORT}" \
      "$FRONTEND_PID_FILE" frontend "$FRONTEND_PORT"; then
    tail -n 80 "$FRONTEND_LOG" >&2 || true
    cleanup_start_failure
    return 1
  fi

  printf 'MetaBuilder development services are ready\n'
}

stop_all() {
  stop_process "$FRONTEND_PID_FILE" frontend
  stop_process "$BACKEND_PID_FILE" backend
  if [[ -f "$ENV_FILE" ]] && command -v docker >/dev/null 2>&1; then
    compose down --remove-orphans
  fi
}

compose_service_health() {
  local service="$1"
  local output normalized state health
  output="$(compose ps --format json "$service" 2>/dev/null || true)"
  normalized="$(printf '%s' "$output" | tr -d '[:space:]')"
  if [[ "$normalized" != *"\"Service\":\"$service\""* ]]; then
    printf 'stopped'
    return
  fi
  state="$(printf '%s' "$normalized" | sed -n 's/.*"State":"\([^"]*\)".*/\1/p')"
  health="$(printf '%s' "$normalized" | sed -n 's/.*"Health":"\([^"]*\)".*/\1/p')"
  if [[ "$state" != "running" ]]; then
    printf '%s' "${state:-stopped}"
  elif [[ -n "$health" ]]; then
    printf '%s' "$health"
  else
    printf 'unknown'
  fi
}

show_status() {
  local postgres_status="stopped"
  local redis_status="stopped"
  printf 'backend: %s\n' "$(process_status "$BACKEND_PID_FILE" backend "$BACKEND_PORT")"
  printf 'frontend: %s\n' "$(process_status "$FRONTEND_PID_FILE" frontend "$FRONTEND_PORT")"
  if [[ -f "$ENV_FILE" ]] && command -v docker >/dev/null 2>&1; then
    postgres_status="$(compose_service_health postgres)"
    redis_status="$(compose_service_health redis)"
  fi
  printf 'postgres: %s\n' "$postgres_status"
  printf 'redis: %s\n' "$redis_status"
  if [[ "$postgres_status" == "healthy" && "$redis_status" == "healthy" ]]; then
    printf 'dependencies: healthy\n'
  elif [[ "$postgres_status" == "stopped" && "$redis_status" == "stopped" ]]; then
    printf 'dependencies: stopped\n'
  else
    printf 'dependencies: degraded\n'
  fi
}

[[ "$#" -eq 1 ]] || usage
case "$1" in
  start) start_all ;;
  stop) stop_all ;;
  status) show_status ;;
  *) usage ;;
esac
