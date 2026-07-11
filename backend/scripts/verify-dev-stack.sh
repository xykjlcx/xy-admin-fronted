#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
DEV_SCRIPT="${REPO_DIR}/scripts/dev.sh"
COMPOSE_FILE="${REPO_DIR}/compose.dev.yml"
ENV_EXAMPLE="${REPO_DIR}/backend/.env.example"
RUNTIME_DIR="${REPO_DIR}/.metabuilder-dev"
OWN_STACK=0
LONG_LIVED_BEFORE=""

fail() {
  printf '[dev-stack] FAIL: %s\n' "$*" >&2
  exit 1
}

cleanup() {
  if [[ "${OWN_STACK}" -eq 1 ]]; then
    "${DEV_SCRIPT}" stop >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

for command in docker curl lsof node ps shasum; do
  command -v "${command}" >/dev/null 2>&1 || fail "missing command: ${command}"
done
[[ -x "${DEV_SCRIPT}" ]] || fail "development script is not executable"

project_hash="$(printf '%s' "${REPO_DIR}" | shasum -a 256 | awk '{print substr($1, 1, 12)}')"
project_name="metabuilder-dev-${project_hash}"

long_lived_mb_state() {
  for container in mb-postgres mb-redis; do
    if docker inspect "${container}" >/dev/null 2>&1; then
      docker inspect \
        --format '{{.Name}}|{{.Id}}|{{.State.Running}}|{{.State.StartedAt}}' \
        "${container}"
    fi
  done | LC_ALL=C sort
}

LONG_LIVED_BEFORE="$(long_lived_mb_state)"

compose_for_gate() {
  docker compose \
    --project-name "${project_name}" \
    --env-file "${ENV_EXAMPLE}" \
    -f "${COMPOSE_FILE}" \
    "$@"
}

listener_pids() {
  { lsof -t -nP -iTCP:"$1" -sTCP:LISTEN 2>/dev/null || true; } | sort -u
}

assert_port_free() {
  local port="$1"
  local listeners="$(listener_pids "${port}")"
  [[ -z "${listeners}" ]] || fail "port ${port} is occupied by pid(s): ${listeners}"
}

read_pid() {
  local file="$1"
  local pid=""
  [[ -f "${file}" ]] || fail "missing pid file: ${file}"
  IFS= read -r pid <"${file}"
  [[ "${pid}" =~ ^[0-9]+$ ]] || fail "invalid pid file: ${file}"
  printf '%s\n' "${pid}"
}

process_cwd() {
  lsof -a -p "$1" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p' | head -n 1
}

assert_managed_process() {
  local pid="$1"
  local role="$2"
  local expected_cwd="$3"
  local port="$4"
  local marker="$5"
  local command="$(ps -p "${pid}" -o command= 2>/dev/null || true)"
  local cwd="$(process_cwd "${pid}")"
  local listeners="$(listener_pids "${port}")"

  kill -0 "${pid}" 2>/dev/null || fail "${role} pid ${pid} is not running"
  [[ "${cwd}" == "${expected_cwd}" ]] ||
    fail "${role} pid ${pid} cwd mismatch: ${cwd}"
  [[ "${command}" == *"${marker}"* ]] ||
    fail "${role} pid ${pid} command mismatch: ${command}"
  [[ "${listeners}" == "${pid}" ]] ||
    fail "${role} pid ${pid} does not exclusively own port ${port}: ${listeners}"
}

assert_health_json() {
  local kind="$1"
  local payload="$2"
  node -e '
    const [kind, payload] = process.argv.slice(1);
    const health = JSON.parse(payload);
    if (health.status !== "UP") process.exit(2);
    const components = Object.keys(health.components ?? {}).sort();
    const expected = kind === "liveness"
      ? ["livenessState"]
      : ["db", "readinessState", "redis"];
    if (JSON.stringify(components) !== JSON.stringify(expected)) process.exit(3);
  ' "${kind}" "${payload}" || fail "${kind} health payload is invalid: ${payload}"
}

run_round() {
  local round="$1"
  local backend_pid frontend_pid repeated_backend_pid repeated_frontend_pid
  local liveness readiness status_output

  OWN_STACK=1
  "${DEV_SCRIPT}" start
  backend_pid="$(read_pid "${RUNTIME_DIR}/backend.pid")"
  frontend_pid="$(read_pid "${RUNTIME_DIR}/frontend.pid")"

  "${DEV_SCRIPT}" start
  repeated_backend_pid="$(read_pid "${RUNTIME_DIR}/backend.pid")"
  repeated_frontend_pid="$(read_pid "${RUNTIME_DIR}/frontend.pid")"
  [[ "${backend_pid}" == "${repeated_backend_pid}" ]] ||
    fail "round ${round} repeated start changed backend pid"
  [[ "${frontend_pid}" == "${repeated_frontend_pid}" ]] ||
    fail "round ${round} repeated start changed frontend pid"

  assert_managed_process \
    "${backend_pid}" backend "${REPO_DIR}/backend" 8080 metabuilder-app-
  assert_managed_process \
    "${frontend_pid}" frontend "${REPO_DIR}/frontend" 5173 vite

  liveness="$(curl -fsS http://127.0.0.1:8080/actuator/health/liveness)"
  readiness="$(curl -fsS http://127.0.0.1:8080/actuator/health/readiness)"
  assert_health_json liveness "${liveness}"
  assert_health_json readiness "${readiness}"

  status_output="$("${DEV_SCRIPT}" status)"
  [[ "${status_output}" == *"backend: running (pid ${backend_pid})"* ]] ||
    fail "round ${round} backend status mismatch: ${status_output}"
  [[ "${status_output}" == *"frontend: running (pid ${frontend_pid})"* ]] ||
    fail "round ${round} frontend status mismatch: ${status_output}"
  [[ "${status_output}" == *"postgres: healthy"* ]] ||
    fail "round ${round} PostgreSQL is not healthy: ${status_output}"
  [[ "${status_output}" == *"redis: healthy"* ]] ||
    fail "round ${round} Redis is not healthy: ${status_output}"
  [[ "${status_output}" == *"dependencies: healthy"* ]] ||
    fail "round ${round} dependency status mismatch: ${status_output}"

  "${DEV_SCRIPT}" stop
  OWN_STACK=0
  for port in 8080 5173 54329 63799; do
    assert_port_free "${port}"
  done
  [[ ! -f "${RUNTIME_DIR}/backend.pid" ]] || fail "round ${round} left backend pid file"
  [[ ! -f "${RUNTIME_DIR}/frontend.pid" ]] || fail "round ${round} left frontend pid file"

  printf '[dev-stack] PASS: round %s backend=%s frontend=%s\n' \
    "${round}" "${backend_pid}" "${frontend_pid}"
}

compose_for_gate config --quiet
printf '[dev-stack] PASS: docker compose config\n'

initial_status="$("${DEV_SCRIPT}" status)"
[[ "${initial_status}" == *"backend: stopped"* ]] || fail "backend is not stopped before gate"
[[ "${initial_status}" == *"frontend: stopped"* ]] || fail "frontend is not stopped before gate"
[[ "${initial_status}" == *"dependencies: stopped"* ]] ||
  fail "current repository compose stack is not stopped before gate"
[[ -z "$(compose_for_gate ps -aq)" ]] || fail "current repository compose project already exists"
for port in 8080 5173 54329 63799; do
  assert_port_free "${port}"
done

run_round 1
run_round 2

LONG_LIVED_AFTER="$(long_lived_mb_state)"
[[ "${LONG_LIVED_AFTER}" == "${LONG_LIVED_BEFORE}" ]] ||
  fail "long-lived mb-postgres/mb-redis state changed during gate"
printf '[dev-stack] PASS: long-lived mb-postgres/mb-redis state was untouched\n'
printf '[dev-stack] OK: two real lifecycle rounds passed for %s\n' "${project_name}"
