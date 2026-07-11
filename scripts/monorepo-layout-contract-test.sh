#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
VITE_CONFIG="$FRONTEND_DIR/vite.config.ts"
TAILWIND_ENTRY="$FRONTEND_DIR/src/styles/global.css"

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

for path in \
  package.json \
  pnpm-lock.yaml \
  pnpm-workspace.yaml \
  vite.config.ts \
  index.html \
  tsconfig.json \
  tsconfig.app.json \
  tsconfig.node.json \
  eslint.config.js \
  src \
  public \
  e2e; do
  [[ ! -e "$ROOT_DIR/$path" ]] || fail "frontend build entry must not remain at repository root: $path"
done

for path in \
  package.json \
  pnpm-lock.yaml \
  pnpm-workspace.yaml \
  vite.config.ts \
  index.html \
  tsconfig.json \
  tsconfig.app.json \
  tsconfig.node.json \
  eslint.config.js \
  src \
  public \
  e2e \
  scripts/design-md-lint.mjs \
  scripts/visual-agent-browser.mjs; do
  [[ -e "$FRONTEND_DIR/$path" ]] || fail "frontend path is missing: frontend/$path"
done

grep -Fq "'/api'" "$VITE_CONFIG" || fail "Vite must proxy /api to the backend"
grep -Fq "target: 'http://127.0.0.1:8080'" "$VITE_CONFIG" ||
  fail "Vite /api proxy must target the local backend"
grep -Fq "@import 'tailwindcss' source('../');" "$TAILWIND_ENTRY" ||
  fail "Tailwind source must remain scoped to frontend/src"

if git -C "$ROOT_DIR" check-ignore -q --no-index \
  backend/modules/admin/src/main/java/com/metabuild/modules/admin/logs/OperationLogService.java; then
  fail "gitignore must not swallow backend business packages named logs"
fi

printf 'monorepo layout contract: PASS\n'
