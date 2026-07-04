import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const projectRoot = resolve(__dirname, '../../..');
const baselinePath = resolve(__dirname, 'theme-token-violations-baseline.json');

const tokenDeclarationFiles = ['src/styles/tokens.css', 'src/styles/global.css'];
const tokenReferenceRoots = [
  'src/styles',
  'src/components/ui',
  'src/components/pro',
  'src/app/shell/widgets',
  'src/modules/admin/pages',
  'src/routes',
  'index.html',
];
const violationRoots = [
  'src/components/ui',
  'src/components/pro',
  'src/app/shell/widgets',
  'src/modules/admin/pages',
  'src/routes',
];

const forbiddenClasses = [
  'border-pri',
  'ring-soft',
  'bg-pri',
  'bg-pri-soft',
  'text-pri',
  'focus-visible:border-pri',
];

function readProjectFile(path: string) {
  return readFileSync(resolve(projectRoot, path), 'utf8');
}

function collectFiles(path: string): string[] {
  const absolute = resolve(projectRoot, path);
  if (!existsSync(absolute)) return [];
  const statFiles = readdirSync(absolute, { withFileTypes: true });
  return statFiles.flatMap((entry) => {
    const next = resolve(absolute, entry.name);
    if (entry.isDirectory()) return collectFiles(next.replace(`${projectRoot}/`, ''));
    return [next.replace(`${projectRoot}/`, '')];
  });
}

function collectScopedFiles(paths: string[]) {
  return paths.flatMap((path) => {
    if (path.includes('.')) return [path];
    return collectFiles(path);
  });
}

function tokenDeclarations() {
  const names = new Set<string>();
  const declarationRe = /(?<![\w-])(--[a-zA-Z0-9_-]+)\s*:/g;

  for (const file of tokenDeclarationFiles) {
    const source = readProjectFile(file);
    for (const match of source.matchAll(declarationRe)) {
      const token = match[1];
      if (token) names.add(token);
    }
  }

  return names;
}

function tokenReferences(source: string) {
  const refs = new Set<string>();
  const varRe = /var\(\s*(--[a-zA-Z0-9_-]+)\s*([,)])/g;
  const bracketRe = /\((--[a-zA-Z0-9_-]+)\)/g;

  for (const match of source.matchAll(varRe)) {
    const token = match[1];
    const suffix = match[2];
    if (!token || suffix === ',') continue;
    refs.add(token);
  }
  for (const match of source.matchAll(bracketRe)) {
    const token = match[1];
    if (token) refs.add(token);
  }

  return refs;
}

function countForbiddenClasses(file: string) {
  const source = readProjectFile(file);
  return forbiddenClasses.reduce((sum, className) => {
    const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(?<![\\w-])${escaped}(?![\\w-])`, 'g');
    return sum + [...source.matchAll(re)].length;
  }, 0);
}

test('CSS 变量引用必须有定义或明确运行时白名单', () => {
  const defined = tokenDeclarations();
  const runtimePrefixes = ['--radix-', '--_'];
  const missing: string[] = [];

  for (const file of collectScopedFiles(tokenReferenceRoots)) {
    if (!/\.(css|ts|tsx|html)$/.test(file)) continue;
    const source = readProjectFile(file);
    for (const token of tokenReferences(source)) {
      if (defined.has(token)) continue;
      if (runtimePrefixes.some((prefix) => token.startsWith(prefix))) continue;
      missing.push(`${file}: ${token}`);
    }
  }

  expect(missing).toEqual([]);
});

test('基础状态 class 命中数必须受 baseline 棘轮约束', () => {
  expect(existsSync(baselinePath), 'theme-token-violations-baseline.json must exist').toBe(true);
  const baseline = JSON.parse(readFileSync(baselinePath, 'utf8')) as Record<string, number>;
  const current: Record<string, number> = {};

  for (const file of collectScopedFiles(violationRoots)) {
    if (!/\.(ts|tsx)$/.test(file)) continue;
    if (file.includes('/__tests__/')) continue;
    const count = countForbiddenClasses(file);
    if (count > 0) current[file] = count;
  }

  expect(current).toEqual(baseline);
});
