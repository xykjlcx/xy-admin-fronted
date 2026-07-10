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
  printf '[module-dependencies] FAIL: %s\n' "$*" >&2
  exit 1
}

[[ -x "${JAVA_HOME}/bin/java" ]] || fail "Java 21 not found at ${JAVA_HOME}"
[[ -x "${BACKEND_DIR}/mvnw" ]] || fail "missing Maven wrapper"
export JAVA_HOME
export PATH="${JAVA_HOME}/bin:${PATH}"

TEMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/metabuilder-module-tree.XXXXXX")"
cleanup() {
  [[ ! -d "${TEMP_DIR}" ]] || rm -R "${TEMP_DIR}"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

tree_log="${TEMP_DIR}/dependency-tree.log"
"${BACKEND_DIR}/mvnw" \
  --no-transfer-progress \
  -f "${BACKEND_DIR}/pom.xml" \
  dependency:tree \
  '-Dincludes=com.metabuild:*' \
  -Dstyle.color=never \
  >"${tree_log}" 2>&1 || {
    cat "${tree_log}" >&2
    fail "Maven effective dependency tree failed"
  }

expected_for() {
  case "$1" in
    metabuilder-parent | metabuilder-shared-kernel | metabuilder-schema-platform | metabuilder-schema-lastmile)
      ;;
    metabuilder-admin-api)
      printf '%s\n' metabuilder-shared-kernel
      ;;
    metabuilder-admin)
      printf '%s\n' \
        metabuilder-admin-api \
        metabuilder-schema-platform \
        metabuilder-shared-kernel
      ;;
    metabuilder-lastmile)
      printf '%s\n' \
        metabuilder-admin-api \
        metabuilder-schema-lastmile \
        metabuilder-shared-kernel
      ;;
    metabuilder-infrastructure)
      printf '%s\n' \
        metabuilder-admin-api \
        metabuilder-shared-kernel
      ;;
    metabuilder-api-contract)
      printf '%s\n' \
        metabuilder-admin-api \
        metabuilder-schema-lastmile \
        metabuilder-schema-platform \
        metabuilder-shared-kernel
      ;;
    metabuilder-app)
      printf '%s\n' \
        metabuilder-admin \
        metabuilder-admin-api \
        metabuilder-api-contract \
        metabuilder-infrastructure \
        metabuilder-lastmile \
        metabuilder-schema-lastmile \
        metabuilder-schema-platform \
        metabuilder-shared-kernel
      ;;
    *) fail "unknown module artifact: $1" ;;
  esac
}

extract_production_closure() {
  local artifact="$1"
  awk -v artifact="${artifact}" '
    /--- dependency:.*:tree / && index($0, " @ " artifact " ---") {
      in_module_tree = 1
      found_tree = 1
      next
    }
    in_module_tree && /< com\.metabuild:metabuilder-/ { exit }
    in_module_tree && /--- dependency:.*:tree / { exit }
    in_module_tree && /^\[INFO\] BUILD / { exit }
    in_module_tree && /\[INFO\].*com\.metabuild:/ && $0 !~ /:test([[:space:]]|$)/ {
      line = $0
      sub(/^.*com\.metabuild:/, "", line)
      split(line, coordinate, ":")
      if (coordinate[1] != artifact) {
        print coordinate[1]
      }
    }
    END {
      if (!found_tree) {
        exit 42
      }
    }
  ' "${tree_log}" | LC_ALL=C sort -u
}

artifacts=(
  metabuilder-parent
  metabuilder-shared-kernel
  metabuilder-admin-api
  metabuilder-schema-platform
  metabuilder-admin
  metabuilder-schema-lastmile
  metabuilder-lastmile
  metabuilder-infrastructure
  metabuilder-api-contract
  metabuilder-app
)
failures=0

for artifact in "${artifacts[@]}"; do
  expected="$(expected_for "${artifact}" | LC_ALL=C sort -u)"
  closure_file="${TEMP_DIR}/${artifact}.closure"
  if ! extract_production_closure "${artifact}" >"${closure_file}"; then
    printf '[module-dependencies] %s tree block is missing\n' "${artifact}" >&2
    failures=$((failures + 1))
    continue
  fi
  actual="$(cat "${closure_file}")"
  if [[ "${actual}" != "${expected}" ]]; then
    printf '[module-dependencies] %s expected:\n%s\n' \
      "${artifact}" "${expected:-<empty>}" >&2
    printf '[module-dependencies] %s actual:\n%s\n' \
      "${artifact}" "${actual:-<empty>}" >&2
    printf '[module-dependencies] %s internal dependency closure mismatch\n' \
      "${artifact}" >&2
    failures=$((failures + 1))
  else
    printf '[module-dependencies] PASS: %s production closure\n' "${artifact}"
  fi
done

if ! awk '
  /--- dependency:.*:tree .* @ metabuilder-schema-lastmile ---/ {
    in_schema_tree = 1
    next
  }
  in_schema_tree && /< com\.metabuild:metabuilder-/ { exit }
  in_schema_tree && /com\.metabuild:metabuilder-schema-platform:.*:test([[:space:]]|$)/ {
    found_test_edge = 1
  }
  END { exit(found_test_edge ? 0 : 1) }
' "${tree_log}"; then
  printf '[module-dependencies] schema-lastmile test-scope platform edge is missing\n' >&2
  failures=$((failures + 1))
else
  printf '[module-dependencies] PASS: schema-lastmile platform edge remains test scope only\n'
fi

if [[ "${failures}" -gt 0 ]]; then
  fail "${failures} module dependency closure(s) violated"
fi

printf '[module-dependencies] OK\n'
