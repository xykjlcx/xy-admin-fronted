import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const projectRoot = resolve(__dirname, '../../..');
const baselinePath = resolve(__dirname, 'theme-token-violations-baseline.json');

const tokenDeclarationFiles = ['src/styles/tokens.css', 'src/styles/global.css'];
const tokenReferenceRoots = [
  'src/styles',
  'src/components/ui',
  'src/components/pro',
  'src/app',
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
const tokenizedStateFiles = [
  'src/components/ui/table.tsx',
  'src/components/pro/PageScaffold.tsx',
  'src/components/pro/Pagination.tsx',
  'src/components/pro/SideList.tsx',
  'src/components/pro/TableShell.tsx',
  'src/app/shell/widgets/AppearanceDrawer.tsx',
  'src/app/shell/widgets/NavMenuInset.tsx',
  'src/app/shell/widgets/NavMenuRail.tsx',
  'src/app/shell/widgets/NavMenuSidebar.tsx',
  'src/app/shell/widgets/SubsystemSwitcher.tsx',
  'src/modules/admin/pages/users/MembersPanel.tsx',
  'src/modules/admin/pages/roles/RoleListPanel.tsx',
  'src/modules/admin/pages/roles/RolePermissionEditor.tsx',
  'src/modules/admin/pages/menus/MenuTreeTable.tsx',
  'src/modules/admin/pages/menus/index.tsx',
];
const fieldFamilyFiles = [
  'src/components/ui/input.tsx',
  'src/components/ui/textarea.tsx',
  'src/components/ui/native-select.tsx',
  'src/components/pro/SearchField.tsx',
];

const forbiddenClasses = [
  'border-pri',
  'ring-soft',
  'bg-pri',
  'bg-pri-soft',
  'text-pri',
  'focus-visible:border-pri',
];
const forbiddenTokenizedStateClasses = [
  'border-pri',
  'ring-soft',
  'bg-pri',
  'bg-pri-soft',
  'text-pri',
  'bg-surface-2',
  'hover:bg-surface-2',
  'focus:bg-surface-2',
  'data-[state=selected]:bg-surface-2',
  'data-[state=active]:bg-surface-2',
];
const forbiddenFieldPrimitiveClasses = [
  'border-input',
  'bg-surface',
  'text-text ',
  'text-text-3',
  'shadow-card-sm',
  'hover:border-control-border',
  'focus-visible:border-pri',
  'focus-visible:ring-soft',
  'focus-within:border-pri',
  'focus-within:ring-soft',
  'aria-invalid:border-danger',
  'aria-invalid:ring-danger-bg',
  'disabled:bg-surface-2',
  'read-only:bg-surface-2',
  'border-[var(--field-border)]',
  'bg-[var(--field-bg)]',
  'text-[var(--field-fg)]',
  'placeholder:text-[var(--field-placeholder)]',
  'hover:border-[var(--field-border-hover)]',
  'focus-visible:bg-[var(--field-bg-focus)]',
  'focus-visible:border-[var(--field-border-focus)]',
  'focus-visible:ring-[length:var(--focus-ring)]',
  'focus-visible:ring-[var(--field-ring-focus)]',
  'focus-visible:ring-[var(--field-ring-invalid)]',
  'focus-within:bg-[var(--field-bg-focus)]',
  'focus-within:border-[var(--field-border-focus)]',
  'focus-within:ring-[length:var(--focus-ring)]',
  'focus-within:ring-[var(--field-ring-focus)]',
  'focus-within:ring-[var(--field-ring-invalid)]',
  'data-[state=open]:border-[var(--field-border-focus)]',
  'data-[state=open]:ring-[length:var(--focus-ring)]',
  'data-[state=open]:ring-[var(--field-ring-focus)]',
  'disabled:bg-[var(--field-bg-disabled)]',
  'read-only:bg-[var(--field-bg-readonly)]',
  'aria-invalid:border-[var(--field-border-invalid)]',
  'aria-invalid:ring-[var(--field-ring-invalid)]',
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

function fieldFamilySources() {
  const sources = fieldFamilyFiles.map((file) => ({ file, source: readProjectFile(file) }));
  const selectSource = readProjectFile('src/components/ui/select.tsx');
  const triggerStart = selectSource.indexOf('function SelectTrigger');
  const contentStart = selectSource.indexOf('function SelectContent');
  sources.push({
    file: 'src/components/ui/select.tsx#SelectTrigger',
    source: selectSource.slice(triggerStart, contentStart),
  });
  return sources;
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

test('已完成 token 化的 UI/Pro/Shell/样板页不得回退到 primitive 状态 class', () => {
  const offenders: string[] = [];

  for (const file of tokenizedStateFiles) {
    const source = readProjectFile(file);

    for (const className of forbiddenTokenizedStateClasses) {
      if (source.includes(className)) offenders.push(`${file}: ${className}`);
    }
  }

  expect(offenders).toEqual([]);
});

test('Field 族基础控件不得绕过 --field-* token 直接消费 primitive 状态 class', () => {
  const offenders: string[] = [];

  for (const { file, source } of fieldFamilySources()) {
    for (const className of forbiddenFieldPrimitiveClasses) {
      if (source.includes(className)) offenders.push(`${file}: ${className}`);
    }
  }

  expect(offenders).toEqual([]);
});
