#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
VERIFIER="${SCRIPT_DIR}/verify-reactor.sh"
TEMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/metabuilder-reactor-contract.XXXXXX")"
failures=0
legacy_namespace="com.meta""builder"
legacy_namespace_path="com/meta""builder"

cleanup() {
  rm -r "${TEMP_DIR}"
}

trap cleanup EXIT

pass() {
  echo "[contract] PASS: $*"
}

fail() {
  echo "[contract] FAIL: $*" >&2
  failures=$((failures + 1))
}

make_fixture() {
  local name="$1"
  local fixture="${TEMP_DIR}/${name}"

  mkdir -p "${fixture}"
  cp "${REPO_DIR}/.gitignore" "${fixture}/.gitignore"
  cp -R "${REPO_DIR}/backend" "${fixture}/backend"
  git init -q "${fixture}"
  echo "${fixture}"
}

expect_verifier_failure() {
  local fixture="$1"
  local expected_message="$2"
  local label="$3"
  local output

  if output="$(bash "${VERIFIER}" --repo-root "${fixture}" 2>&1)"; then
    fail "${label}: verifier unexpectedly passed"
    return
  fi

  if grep -Fq "${expected_message}" <<<"${output}"; then
    pass "${label}"
  else
    fail "${label}: verifier failed for the wrong reason"
    printf '%s\n' "${output}" >&2
  fi
}

if bash "${VERIFIER}" --repo-root "${REPO_DIR}" >/dev/null; then
  pass "current repository"
else
  fail "current repository must pass"
fi

target_ignore_fixture="$(make_fixture missing-target-ignore)"
grep -Ev '^\*\*/target/$' \
  "${target_ignore_fixture}/.gitignore" >"${target_ignore_fixture}/.gitignore.tmp"
mv "${target_ignore_fixture}/.gitignore.tmp" "${target_ignore_fixture}/.gitignore"
expect_verifier_failure \
  "${target_ignore_fixture}" \
  "Maven target output must be ignored" \
  "missing target ignore rule is rejected"

flatten_ignore_fixture="$(make_fixture missing-flatten-ignore)"
grep -Ev '^\.flattened-pom\.xml$' \
  "${flatten_ignore_fixture}/.gitignore" >"${flatten_ignore_fixture}/.gitignore.tmp"
mv "${flatten_ignore_fixture}/.gitignore.tmp" "${flatten_ignore_fixture}/.gitignore"
expect_verifier_failure \
  "${flatten_ignore_fixture}" \
  ".flattened-pom.xml must be ignored" \
  "missing flattened POM ignore rule is rejected"

env_fixture="$(make_fixture missing-env-example-exception)"
grep -Ev '^!\*\*/\.env\.example$' \
  "${env_fixture}/.gitignore" >"${env_fixture}/.gitignore.tmp"
mv "${env_fixture}/.gitignore.tmp" "${env_fixture}/.gitignore"
expect_verifier_failure \
  "${env_fixture}" \
  "backend/.env.example must be committable" \
  "missing .env.example exception is rejected"

legacy_pom_fixture="$(make_fixture legacy-namespace-pom)"
awk -v legacy_namespace="${legacy_namespace}" '
  !injected && /^[[:space:]]*<artifactId>metabuilder-parent<\/artifactId>[[:space:]]*$/ {
    print
    print "  <description>" legacy_namespace " namespace mutation</description>"
    injected = 1
    next
  }
  { print }
' "${legacy_pom_fixture}/backend/pom.xml" \
  >"${legacy_pom_fixture}/backend/pom.xml.tmp"
mv \
  "${legacy_pom_fixture}/backend/pom.xml.tmp" \
  "${legacy_pom_fixture}/backend/pom.xml"
expect_verifier_failure \
  "${legacy_pom_fixture}" \
  "canonical namespace must be com.metabuild" \
  "legacy namespace in POM content is rejected"

legacy_package_fixture="$(make_fixture legacy-namespace-package)"
legacy_package_file="${legacy_package_fixture}/backend/app/src/main/java/com/metabuild/app/LegacyNamespaceProbe.java"
mkdir -p "$(dirname "${legacy_package_file}")"
printf '%s\n' \
  "package ${legacy_namespace}.app;" \
  '' \
  'final class LegacyNamespaceProbe {}' \
  >"${legacy_package_file}"
expect_verifier_failure \
  "${legacy_package_fixture}" \
  "canonical namespace must be com.metabuild" \
  "legacy Java package declaration is rejected"

legacy_path_fixture="$(make_fixture legacy-namespace-path)"
legacy_path_file="${legacy_path_fixture}/backend/app/src/main/java/${legacy_namespace_path}/path/LegacyPathProbe.txt"
mkdir -p "$(dirname "${legacy_path_file}")"
printf '%s\n' 'legacy path mutation' >"${legacy_path_file}"
expect_verifier_failure \
  "${legacy_path_fixture}" \
  "canonical namespace must be com.metabuild" \
  "legacy namespace source path is rejected"

dependency_fixture="$(make_fixture extra-lastmile-dependency)"
awk '
  !injected && /^[[:space:]]*<\/dependencies>[[:space:]]*$/ {
    print "    <dependency>"
    print "      <groupId>com.metabuild</groupId>"
    print "      <artifactId>metabuilder-infrastructure</artifactId>"
    print "    </dependency>"
    injected = 1
  }
  { print }
' "${dependency_fixture}/backend/modules/lastmile/pom.xml" \
  >"${dependency_fixture}/backend/modules/lastmile/pom.xml.tmp"
mv \
  "${dependency_fixture}/backend/modules/lastmile/pom.xml.tmp" \
  "${dependency_fixture}/backend/modules/lastmile/pom.xml"
expect_verifier_failure \
  "${dependency_fixture}" \
  "lastmile direct dependencies must exactly match the allowlist" \
  "extra lastmile dependency is rejected"

if [[ "${failures}" -gt 0 ]]; then
  echo "[contract] FAILED: ${failures} contract(s) violated" >&2
  exit 1
fi

echo "[contract] OK"
