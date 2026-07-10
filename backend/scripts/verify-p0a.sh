#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

run_gate() {
  local label="$1"
  shift
  printf '[p0a] RUN: %s\n' "${label}"
  "$@"
  printf '[p0a] PASS: %s\n' "${label}"
}

run_gate \
  "reactor structure contracts" \
  "${SCRIPT_DIR}/verify-reactor-contract-test.sh"
run_gate \
  "development shell contracts" \
  "${REPO_DIR}/scripts/dev-contract-test.sh"
run_gate \
  "effective production dependency matrix contracts" \
  "${SCRIPT_DIR}/verify-module-dependencies-contract-test.sh"
run_gate \
  "Maven verify and skip-test lifecycle contracts" \
  "${SCRIPT_DIR}/verify-maven-test-gate.sh"
run_gate \
  "dual-schema codegen reproducibility contracts" \
  "${SCRIPT_DIR}/verify-codegen-reproducibility-contract-test.sh"
run_gate \
  "real development stack lifecycle" \
  "${SCRIPT_DIR}/verify-dev-stack.sh"

printf '[p0a] OK\n'
