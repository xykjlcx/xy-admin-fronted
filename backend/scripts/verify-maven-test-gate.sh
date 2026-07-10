#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
JAVA_HOME="${JAVA_HOME_21:-/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home}"
MVNW="${BACKEND_DIR}/mvnw"
POM="${BACKEND_DIR}/pom.xml"
MUTATIONS_ONLY=0
TEMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/metabuilder-maven-gate.XXXXXX")"

cleanup() {
  [[ ! -d "${TEMP_DIR}" ]] || rm -R "${TEMP_DIR}"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

if [[ "$#" -gt 0 ]]; then
  [[ "$#" -eq 1 && "$1" == "--mutations-only" ]] || {
    printf 'Usage: %s [--mutations-only]\n' "$0" >&2
    exit 64
  }
  MUTATIONS_ONLY=1
fi

fail() {
  printf '[maven-test-gate] FAIL: %s\n' "$*" >&2
  exit 1
}

pass() {
  printf '[maven-test-gate] PASS: %s\n' "$*"
}

[[ -x "${JAVA_HOME}/bin/java" ]] || fail "Java 21 not found at ${JAVA_HOME}"
export JAVA_HOME
export PATH="${JAVA_HOME}/bin:${PATH}"

run_maven() {
  "${MVNW}" --no-transfer-progress -q -f "${POM}" "$@"
}

expect_verify_skip_rejected() {
  local property="$1"
  local label="$2"
  local expected_property="$3"
  local output_file
  output_file="${TEMP_DIR}/${expected_property}.log"

  if run_maven verify "${property}" >"${output_file}" 2>&1; then
    fail "${label} unexpectedly succeeded"
  fi
  if ! grep -Fq "enforce-tests-during-verify" "${output_file}" ||
      ! grep -Fq "Property \"${expected_property}\" evaluates to \"true\"" "${output_file}"; then
    cat "${output_file}" >&2
    fail "${label} failed for a reason other than the verify test gate"
  fi
  pass "${label} is rejected"
}

if [[ "${MUTATIONS_ONLY}" -eq 0 ]]; then
  run_maven clean verify
  pass "normal clean verify executes the complete reactor without stale reports"
fi

expect_verify_skip_rejected "-DskipTests" "verify -DskipTests" "skipTests"
expect_verify_skip_rejected \
  "-Dmaven.test.skip=true" \
  "verify -Dmaven.test.skip=true" \
  "maven.test.skip"

if [[ "${MUTATIONS_ONLY}" -eq 0 ]]; then
  run_maven package -DskipTests
  pass "package -DskipTests remains available for local development"
fi

printf '[maven-test-gate] OK\n'
