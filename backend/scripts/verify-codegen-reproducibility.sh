#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
JAVA_HOME="${JAVA_HOME_21:-/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home}"

if [[ "$#" -gt 0 ]]; then
  [[ "$#" -eq 2 && "$1" == "--repo-root" ]] || {
    printf 'Usage: %s [--repo-root PATH]\n' "$0" >&2
    exit 64
  }
  BACKEND_DIR="$(cd "$2/backend" && pwd)"
fi

fail() {
  printf '[codegen] FAIL: %s\n' "$*" >&2
  exit 1
}

[[ -x "${JAVA_HOME}/bin/java" ]] || fail "Java 21 not found at ${JAVA_HOME}"
[[ -x "${BACKEND_DIR}/mvnw" ]] || fail "missing Maven wrapper"
export JAVA_HOME
export PATH="${JAVA_HOME}/bin:${PATH}"

TEMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/metabuilder-codegen.XXXXXX")"
cleanup() {
  [[ ! -d "${TEMP_DIR}" ]] || rm -R "${TEMP_DIR}"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

schemas=(schema-platform schema-lastmile)
for schema in "${schemas[@]}"; do
  generated="${BACKEND_DIR}/${schema}/src/main/jooq-generated"
  [[ -d "${generated}" ]] || fail "missing generated tree: ${schema}"
  mkdir -p "${TEMP_DIR}/before/${schema}"
  cp -R "${generated}/." "${TEMP_DIR}/before/${schema}/"
done

"${BACKEND_DIR}/mvnw" \
  --no-transfer-progress \
  -f "${BACKEND_DIR}/pom.xml" \
  -Pcodegen \
  -pl schema-platform,schema-lastmile \
  -am \
  clean verify

drift=0
for schema in "${schemas[@]}"; do
  generated="${BACKEND_DIR}/${schema}/src/main/jooq-generated"
  diff_file="${TEMP_DIR}/${schema}.diff"
  if ! diff -ruN "${TEMP_DIR}/before/${schema}" "${generated}" >"${diff_file}"; then
    printf '[codegen] generated drift: %s\n' "${schema}" >&2
    sed -n '1,200p' "${diff_file}" >&2
    drift=1
  else
    file_count="$(find "${generated}" -type f | wc -l | tr -d ' ')"
    printf '[codegen] PASS: %s generated tree unchanged (%s files)\n' \
      "${schema}" "${file_count}"
  fi
done

[[ "${drift}" -eq 0 ]] || fail "generated trees changed after clean codegen lifecycle"
printf '[codegen] OK: both schema generated trees are byte-identical\n'
