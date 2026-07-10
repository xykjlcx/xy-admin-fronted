#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
VERIFIER="${SCRIPT_DIR}/verify-lastmile-dependencies.sh"
TEMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/metabuilder-lastmile-contract.XXXXXX")"

cleanup() {
  rm -rf "${TEMP_DIR}"
}
trap cleanup EXIT

fail() {
  printf '[lastmile-contract] FAIL: %s\n' "$*" >&2
  exit 1
}

if ! "${VERIFIER}" --repo-root "${REPO_DIR}"; then
  fail "current repository must pass"
fi

fixture="${TEMP_DIR}/transitive-extra-artifact"
mkdir -p "${fixture}/backend"
rsync -a \
  --exclude target \
  --exclude .flattened-pom.xml \
  "${REPO_DIR}/backend/" \
  "${fixture}/backend/"

awk '
  !injected && /^[[:space:]]*<\/dependencies>[[:space:]]*$/ {
    print "    <dependency>"
    print "      <groupId>com.metabuild</groupId>"
    print "      <artifactId>metabuilder-schema-platform</artifactId>"
    print "    </dependency>"
    injected = 1
  }
  { print }
' "${fixture}/backend/admin-api/pom.xml" \
  >"${fixture}/backend/admin-api/pom.xml.tmp"
mv \
  "${fixture}/backend/admin-api/pom.xml.tmp" \
  "${fixture}/backend/admin-api/pom.xml"

if output="$("${VERIFIER}" --repo-root "${fixture}" 2>&1)"; then
  fail "transitive extra internal artifact unexpectedly passed"
fi
if [[ "${output}" != *"internal dependency closure must exactly match the allowlist"* ]]; then
  printf '%s\n' "${output}" >&2
  fail "transitive mutation failed for the wrong reason"
fi

printf '[lastmile-contract] PASS: transitive extra artifact is rejected\n'
