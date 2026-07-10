#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_DIR="$(cd "${BACKEND_DIR}/.." && pwd)"
JAVA_HOME="${JAVA_HOME_21:-/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home}"

fail() {
  echo "[reactor] FAIL: $*" >&2
  exit 1
}

pass() {
  echo "[reactor] PASS: $*"
}

require_file() {
  local file="$1"
  [[ -f "${file}" ]] || fail "missing file: ${file#"${REPO_DIR}/"}"
}

require_file "${JAVA_HOME}/bin/java"
java_version="$("${JAVA_HOME}/bin/java" -version 2>&1 | head -n 1)"
[[ "${java_version}" == *'version "21.'* ]] || fail "Java 21 required, found: ${java_version}"
pass "Java 21"

root_pom="${BACKEND_DIR}/pom.xml"
require_file "${root_pom}"

modules=(
  "app"
  "shared-kernel"
  "admin-api"
  "schema-platform"
  "schema-lastmile"
  "infrastructure"
  "api-contract"
  "modules/admin"
  "modules/lastmile"
)

package_dirs=(
  "com/metabuilder/app"
  "com/metabuilder/shared/kernel"
  "com/metabuilder/admin/api"
  "com/metabuilder/schema/platform"
  "com/metabuilder/schema/lastmile"
  "com/metabuilder/infrastructure"
  "com/metabuilder/api/contract"
  "com/metabuilder/modules/admin"
  "com/metabuilder/modules/lastmile"
)

marker_classes=(
  "MetaBuilderApplicationMarker"
  "SharedKernelMarker"
  "AdminApiMarker"
  "PlatformSchemaMarker"
  "LastmileSchemaMarker"
  "InfrastructureMarker"
  "ApiContractMarker"
  "AdminModuleMarker"
  "LastmileModuleMarker"
)

module_count="$(grep -Ec '<module>[^<]+</module>' "${root_pom}" || true)"
[[ "${module_count}" -eq "${#modules[@]}" ]] || fail "expected ${#modules[@]} reactor modules, found ${module_count}"

for index in "${!modules[@]}"; do
  module="${modules[${index}]}"
  require_file "${BACKEND_DIR}/${module}/pom.xml"
  grep -Fq "<module>${module}</module>" "${root_pom}" || fail "root reactor does not declare module: ${module}"
  package_dir="${BACKEND_DIR}/${module}/src/main/java/${package_dirs[${index}]}"
  require_file "${package_dir}/${marker_classes[${index}]}.java"
  require_file "${package_dir}/package-info.java"
done
pass "nine reactor modules and markers"

require_file "${BACKEND_DIR}/mvnw"
require_file "${BACKEND_DIR}/mvnw.cmd"
require_file "${BACKEND_DIR}/.mvn/wrapper/maven-wrapper.properties"

if grep -R -n --include='pom.xml' 'sa-token-jwt' "${BACKEND_DIR}" >/dev/null; then
  fail "sa-token-jwt is forbidden"
fi
pass "sa-token-jwt absent"

lastmile_pom="${BACKEND_DIR}/modules/lastmile/pom.xml"
for required_dependency in metabuilder-admin-api metabuilder-shared-kernel metabuilder-schema-lastmile; do
  grep -Fq "<artifactId>${required_dependency}</artifactId>" "${lastmile_pom}" || fail "lastmile missing dependency: ${required_dependency}"
done

for forbidden_dependency in metabuilder-admin metabuilder-schema-platform; do
  if grep -Fq "<artifactId>${forbidden_dependency}</artifactId>" "${lastmile_pom}"; then
    fail "lastmile must not depend on: ${forbidden_dependency}"
  fi
done

admin_pom="${BACKEND_DIR}/modules/admin/pom.xml"
if grep -Fq '<artifactId>metabuilder-lastmile</artifactId>' "${admin_pom}"; then
  fail "admin must not depend on lastmile"
fi
pass "admin and lastmile dependency boundaries"

cd "${REPO_DIR}"
git check-ignore --no-index -q backend/app/target/reactor-probe || fail "Maven target output must be ignored"
git check-ignore --no-index -q backend/.flattened-pom.xml || fail ".flattened-pom.xml must be ignored"
if git check-ignore --no-index -q backend/.env.example; then
  fail "backend/.env.example must be committable"
fi
pass "gitignore contract"

echo "[reactor] OK"
