#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEV_SCRIPT="$ROOT_DIR/scripts/dev.sh"
ENV_EXAMPLE="$ROOT_DIR/backend/.env.example"
COMPOSE_FILE="$ROOT_DIR/compose.dev.yml"
ADR_FILE="$ROOT_DIR/docs/adr/0001-metabuilder-backend-contract.md"
APP_POM="$ROOT_DIR/backend/app/pom.xml"
LIFECYCLE_CONTRACT="$ROOT_DIR/scripts/dev-lifecycle-contract-test.sh"

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

assert_file() {
  [[ -f "$1" ]] || fail "missing $1"
}

assert_contains() {
  local file="$1"
  local expected="$2"
  grep -Fq "$expected" "$file" || fail "$file does not contain $expected"
}

assert_file "$DEV_SCRIPT"
assert_file "$ENV_EXAMPLE"
assert_file "$COMPOSE_FILE"
assert_file "$ADR_FILE"
assert_file "$APP_POM"
assert_file "$LIFECYCLE_CONTRACT"
[[ -x "$DEV_SCRIPT" ]] || fail "$DEV_SCRIPT is not executable"
[[ -x "$LIFECYCLE_CONTRACT" ]] || fail "$LIFECYCLE_CONTRACT is not executable"
bash -n "$DEV_SCRIPT"

for key in \
  DB_URL \
  DB_USERNAME \
  DB_PASSWORD \
  REDIS_HOST \
  REDIS_PORT \
  METABUILDER_AUTH_TOKEN_SECRET \
  METABUILDER_CORS_ALLOWED_ORIGINS; do
  grep -Eq "^${key}=" "$ENV_EXAMPLE" || fail "$ENV_EXAMPLE is missing $key"
done

assert_contains "$COMPOSE_FILE" "postgres:16-alpine"
assert_contains "$COMPOSE_FILE" "redis:7-alpine"
assert_contains "$DEV_SCRIPT" 'FRONTEND_DIR="$ROOT_DIR/frontend"'
assert_contains "$ADR_FILE" "RFC 9457"
assert_contains "$ADR_FILE" "/api/*"
assert_contains "$ADR_FILE" "UUIDv7"
assert_contains "$ADR_FILE" "CORS 默认空"

postgresql_dependency_count="$(grep -c '<groupId>org.postgresql</groupId>' "$APP_POM")"
[[ "$postgresql_dependency_count" -eq 1 ]] || fail "app POM must declare PostgreSQL exactly once"

status_output="$($DEV_SCRIPT status)"
[[ "$status_output" == *"backend:"* ]] || fail "status does not report backend"
[[ "$status_output" == *"frontend:"* ]] || fail "status does not report frontend"

if "$DEV_SCRIPT" unsupported >/dev/null 2>&1; then
  fail "unsupported command must fail"
fi

TMP_DIR="$(mktemp -d)"
SLEEP_PID=""
cleanup() {
  if [[ -n "$SLEEP_PID" ]] && kill -0 "$SLEEP_PID" 2>/dev/null; then
    kill "$SLEEP_PID" 2>/dev/null || true
    wait "$SLEEP_PID" 2>/dev/null || true
  fi
  rm -R "$TMP_DIR"
}
trap cleanup EXIT

mkdir -p "$TMP_DIR/project/scripts" "$TMP_DIR/project/backend" "$TMP_DIR/project/.metabuilder-dev" "$TMP_DIR/bin"
cp "$DEV_SCRIPT" "$TMP_DIR/project/scripts/dev.sh"
cp "$ENV_EXAMPLE" "$TMP_DIR/project/backend/.env.example"
cp "$COMPOSE_FILE" "$TMP_DIR/project/compose.dev.yml"
printf '#!/usr/bin/env bash\nexit 0\n' >"$TMP_DIR/bin/docker"
chmod +x "$TMP_DIR/bin/docker" "$TMP_DIR/project/scripts/dev.sh"

(cd "$TMP_DIR" && exec sleep 60) </dev/null >/dev/null 2>&1 &
SLEEP_PID=$!
printf '%s\n' "$SLEEP_PID" >"$TMP_DIR/project/.metabuilder-dev/backend.pid"

PATH="$TMP_DIR/bin:$PATH" "$TMP_DIR/project/scripts/dev.sh" stop >/dev/null 2>&1
kill -0 "$SLEEP_PID" 2>/dev/null || fail "stop killed a process outside the current repository"

printf 'dev shell contract: PASS\n'
"$LIFECYCLE_CONTRACT"
