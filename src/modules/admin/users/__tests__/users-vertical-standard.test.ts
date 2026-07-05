import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const projectRoot = resolve(__dirname, '../../../../..');
const usersRoot = resolve(projectRoot, 'src/modules/admin/users');

function readProjectFile(path: string) {
  return readFileSync(resolve(projectRoot, path), 'utf8');
}

function collectFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(dir, entry.name);
    return entry.isDirectory() ? collectFiles(path) : [path];
  });
}

test('users route points to the vertical module and old users page directory is gone', () => {
  const routeSource = readProjectFile('src/routes/_auth/admin/users.tsx');

  expect(routeSource).toContain('@/modules/admin/users');
  expect(routeSource).not.toContain('@/modules/admin/pages/users');
  expect(existsSync(resolve(projectRoot, 'src/modules/admin/pages/users'))).toBe(false);
});

test('users vertical module keeps the required package shape', () => {
  for (const path of ['index.tsx', 'api', 'mocks', 'list', 'detail', 'form']) {
    expect(existsSync(resolve(usersRoot, path)), `users/${path} should exist`).toBe(true);
  }

  expect(existsSync(resolve(usersRoot, 'pages'))).toBe(false);
});

test('users index remains a UI skeleton without data hooks', () => {
  const source = readProjectFile('src/modules/admin/users/index.tsx');

  expect(source).not.toMatch(/use(Query|SuspenseQuery|Mutation|QueryClient)\b/);
});

test('users query keys only come from the api key factory', () => {
  const files = collectFiles(usersRoot)
    .filter((file) => file.endsWith('.ts') || file.endsWith('.tsx'))
    .filter((file) => !file.includes('/__tests__/'))
    .filter((file) => !file.endsWith('/api/keys.ts'));

  for (const file of files) {
    const relative = file.replace(`${projectRoot}/`, '');
    const source = readFileSync(file, 'utf8');

    expect(source, `${relative} should not inline iam users query keys`).not.toMatch(/\[\s*['"]iam['"]\s*,\s*['"]users['"]/);
    expect(source, `${relative} should not inline iam depts query keys`).not.toMatch(/\[\s*['"]iam['"]\s*,\s*['"]depts['"]/);
  }
});

test('users dto types are only declared by api schema inference', () => {
  const files = collectFiles(usersRoot)
    .filter((file) => file.endsWith('.ts') || file.endsWith('.tsx'))
    .filter((file) => !file.includes('/__tests__/'))
    .filter((file) => !file.endsWith('/api/schema.ts'));

  for (const file of files) {
    const relative = file.replace(`${projectRoot}/`, '');
    const source = readFileSync(file, 'utf8');

    expect(source, `${relative} should not redeclare UserDto`).not.toMatch(/interface\s+UserDto\b/);
    expect(source, `${relative} should not redeclare DeptDto`).not.toMatch(/interface\s+DeptDto\b/);
  }
});

test('users components do not pass React setState functions as props', () => {
  const files = ['list', 'detail', 'form'].flatMap((dir) =>
    collectFiles(resolve(usersRoot, dir)).filter((file) => file.endsWith('.ts') || file.endsWith('.tsx')),
  );

  for (const file of files) {
    const relative = file.replace(`${projectRoot}/`, '');
    const source = readFileSync(file, 'utf8');

    expect(source, `${relative} should not type props as Dispatch<SetStateAction>`).not.toContain(
      'Dispatch<SetStateAction',
    );
    expect(source, `${relative} should not expose setter dispatch props`).not.toMatch(
      /\bset[A-Z]\w*\??\s*:\s*(?:React\.)?Dispatch\b/,
    );
    expect(source, `${relative} should not expose setter callback props`).not.toMatch(
      /\bset[A-Z]\w*\??\s*:\s*\(/,
    );
  }
});

test('users pro dependencies stay business agnostic', () => {
  for (const file of ['src/components/pro/DataTable.tsx', 'src/components/pro/Tree.tsx']) {
    const source = readProjectFile(file);

    expect(source).not.toContain('@/modules/');
    expect(source).not.toContain('useTranslation');
  }
});
