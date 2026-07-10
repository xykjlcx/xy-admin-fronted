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
  printf '[lastmile-dependencies] FAIL: %s\n' "$*" >&2
  exit 1
}

[[ -x "${JAVA_HOME}/bin/java" ]] || fail "Java 21 not found at ${JAVA_HOME}"
[[ -x "${BACKEND_DIR}/mvnw" ]] || fail "missing Maven wrapper"
export JAVA_HOME
export PATH="${JAVA_HOME}/bin:${PATH}"

tree_log="$(mktemp "${TMPDIR:-/tmp}/metabuilder-lastmile-tree.XXXXXX")"
closure_file="$(mktemp "${TMPDIR:-/tmp}/metabuilder-lastmile-closure.XXXXXX")"
cleanup() {
  rm -f "${tree_log}" "${closure_file}"
}
trap cleanup EXIT

"${BACKEND_DIR}/mvnw" \
  --no-transfer-progress \
  -f "${BACKEND_DIR}/pom.xml" \
  -pl modules/lastmile \
  -am \
  dependency:tree \
  '-Dincludes=com.metabuild:*' \
  -Dstyle.color=never \
  >"${tree_log}" 2>&1 || {
    cat "${tree_log}" >&2
    fail "Maven effective dependency tree failed"
  }

awk '
  /--- dependency:.*:tree .* @ metabuilder-lastmile ---/ {
    in_lastmile_tree = 1
    next
  }
  in_lastmile_tree && /^\[INFO\] ---/ { exit }
  in_lastmile_tree && /^\[INFO\] BUILD / { exit }
  in_lastmile_tree && /\[INFO\].*com\.metabuild:/ && $0 !~ /:test([[:space:]]|$)/ { print }
' "${tree_log}" \
  | sed -E 's/.*com\.metabuild:([^:]+):.*/\1/' \
  | grep -v '^metabuilder-lastmile$' \
  | LC_ALL=C sort -u \
  >"${closure_file}"

expected="$({
  printf '%s\n' \
    metabuilder-admin-api \
    metabuilder-schema-lastmile \
    metabuilder-shared-kernel
} | LC_ALL=C sort -u)"
actual="$(cat "${closure_file}")"

if [[ "${actual}" != "${expected}" ]]; then
  printf '[lastmile-dependencies] expected:\n%s\n' "${expected}" >&2
  printf '[lastmile-dependencies] actual:\n%s\n' "${actual:-<empty>}" >&2
  fail "lastmile internal dependency closure must exactly match the allowlist"
fi

printf '[lastmile-dependencies] PASS: effective internal closure is exact\n'
