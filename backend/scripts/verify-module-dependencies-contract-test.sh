#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
VERIFIER="${SCRIPT_DIR}/verify-module-dependencies.sh"
TEMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/metabuilder-module-contract.XXXXXX")"

cleanup() {
  [[ ! -d "${TEMP_DIR}" ]] || rm -R "${TEMP_DIR}"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

fail() {
  printf '[module-contract] FAIL: %s\n' "$*" >&2
  exit 1
}

make_fixture() {
  local name="$1"
  local fixture="${TEMP_DIR}/${name}"
  mkdir -p "${fixture}/backend"
  rsync -a \
    --exclude target \
    --exclude .flattened-pom.xml \
    "${REPO_DIR}/backend/" \
    "${fixture}/backend/"
  printf '%s\n' "${fixture}"
}

inject_production_dependency() {
  local pom="$1"
  local artifact="$2"
  awk -v artifact="${artifact}" '
    !injected && /^[[:space:]]*<\/dependencies>[[:space:]]*$/ {
      print "    <dependency>"
      print "      <groupId>com.metabuild</groupId>"
      print "      <artifactId>" artifact "</artifactId>"
      print "    </dependency>"
      injected = 1
    }
    { print }
  ' "${pom}" >"${pom}.tmp"
  mv "${pom}.tmp" "${pom}"
}

expect_rejected() {
  local fixture="$1"
  local expected_artifact="$2"
  local label="$3"
  local output=""
  if output="$("${VERIFIER}" --repo-root "${fixture}" 2>&1)"; then
    fail "${label} unexpectedly passed"
  fi
  if [[ "${output}" != *"${expected_artifact} internal dependency closure mismatch"* ]]; then
    printf '%s\n' "${output}" >&2
    fail "${label} failed for the wrong reason"
  fi
  printf '[module-contract] PASS: %s\n' "${label}"
}

"${VERIFIER}" --repo-root "${REPO_DIR}"

admin_fixture="$(make_fixture admin-schema-lastmile)"
inject_production_dependency \
  "${admin_fixture}/backend/modules/admin/pom.xml" \
  metabuilder-schema-lastmile
expect_rejected \
  "${admin_fixture}" \
  metabuilder-admin \
  "admin to lastmile schema is rejected even without class references"

infrastructure_fixture="$(make_fixture infrastructure-schema-platform)"
inject_production_dependency \
  "${infrastructure_fixture}/backend/infrastructure/pom.xml" \
  metabuilder-schema-platform
expect_rejected \
  "${infrastructure_fixture}" \
  metabuilder-infrastructure \
  "infrastructure to platform schema is rejected even without class references"

reverse_fixture="$(make_fixture admin-api-schema-platform)"
inject_production_dependency \
  "${reverse_fixture}/backend/admin-api/pom.xml" \
  metabuilder-schema-platform
expect_rejected \
  "${reverse_fixture}" \
  metabuilder-admin-api \
  "admin-api reverse dependency is rejected"

shared_fixture="$(make_fixture shared-kernel-schema-platform)"
inject_production_dependency \
  "${shared_fixture}/backend/shared-kernel/pom.xml" \
  metabuilder-schema-platform
expect_rejected \
  "${shared_fixture}" \
  metabuilder-shared-kernel \
  "shared-kernel reverse dependency is rejected"

transitive_fixture="$(make_fixture lastmile-transitive-extra)"
inject_production_dependency \
  "${transitive_fixture}/backend/admin-api/pom.xml" \
  metabuilder-schema-platform
expect_rejected \
  "${transitive_fixture}" \
  metabuilder-lastmile \
  "lastmile transitive extra artifact is rejected"

printf '[module-contract] OK\n'
