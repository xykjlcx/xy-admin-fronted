#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
VERIFIER="${SCRIPT_DIR}/verify-codegen-reproducibility.sh"
TEMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/metabuilder-codegen-contract.XXXXXX")"

cleanup() {
  [[ ! -d "${TEMP_DIR}" ]] || rm -R "${TEMP_DIR}"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

fail() {
  printf '[codegen-contract] FAIL: %s\n' "$*" >&2
  exit 1
}

"${VERIFIER}" --repo-root "${REPO_DIR}"

fixture="${TEMP_DIR}/generated-drift"
mkdir -p "${fixture}/backend"
rsync -a \
  --exclude target \
  --exclude .flattened-pom.xml \
  "${REPO_DIR}/backend/" \
  "${fixture}/backend/"

printf '\n// codegen drift fixture\n' >> \
  "${fixture}/backend/schema-platform/src/main/jooq-generated/com/metabuild/schema/platform/Tables.java"

if output="$("${VERIFIER}" --repo-root "${fixture}" 2>&1)"; then
  fail "mutated generated tree unexpectedly passed"
fi
if [[ "${output}" != *"generated trees changed after clean codegen lifecycle"* ]]; then
  printf '%s\n' "${output}" >&2
  fail "generated mutation failed for the wrong reason"
fi

printf '[codegen-contract] PASS: generated drift mutation is rejected\n'
