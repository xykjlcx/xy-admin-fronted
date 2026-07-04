import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseConfigFileTextToJson } from 'typescript';

const projectRoot = resolve(__dirname, '../../..');
const adminRoutesDir = resolve(projectRoot, 'src/routes/_auth/admin');
const adminApiDir = resolve(projectRoot, 'src/modules/admin/api');
const sourceRoot = resolve(projectRoot, 'src');

function readProjectFile(path: string) {
  return readFileSync(resolve(projectRoot, path), 'utf8');
}

function readTsConfig(path: string) {
  const parsed = parseConfigFileTextToJson(path, readProjectFile(path));
  if (parsed.error) throw new Error(parsed.error.messageText.toString());
  return parsed.config as {
    compilerOptions?: {
      baseUrl?: string;
      ignoreDeprecations?: string;
      paths?: Record<string, string[]>;
    };
  };
}

test('admin routes import page entries from module pages', () => {
  const routeEntries = readdirSync(adminRoutesDir)
    .filter((file) => file.endsWith('.tsx'))
    .map((file) => ({
      route: `src/routes/_auth/admin/${file}`,
      page: file.replace(/\.tsx$/, ''),
    }));

  for (const entry of routeEntries) {
    const source = readProjectFile(entry.route);

    expect(source).toContain(`@/modules/admin/pages/${entry.page}`);
    expect(source).not.toContain('@/modules/admin/components');
  }
});

test('admin business pages expose an index entry', () => {
  const pageEntries = readdirSync(adminRoutesDir)
    .filter((file) => file.endsWith('.tsx'))
    .map((file) => `src/modules/admin/pages/${file.replace(/\.tsx$/, '')}/index.tsx`);

  for (const entry of pageEntries) {
    expect(existsSync(resolve(projectRoot, entry))).toBe(true);
  }
});

test('admin module does not keep legacy components page directories', () => {
  expect(existsSync(resolve(projectRoot, 'src/modules/admin/components'))).toBe(false);
});

test('source tree does not keep unused starter assets or generated caches', () => {
  expect(existsSync(resolve(projectRoot, 'src/assets'))).toBe(false);
  expect(existsSync(resolve(projectRoot, 'src/node_modules'))).toBe(false);
});

test('root TypeScript configs expose the app alias for shadcn and external CLIs', () => {
  for (const file of ['tsconfig.json', 'tsconfig.app.json']) {
    const config = readTsConfig(file);

    expect(config.compilerOptions?.baseUrl, `${file} should expose the project root as baseUrl`).toBe('.');
    expect(
      config.compilerOptions?.ignoreDeprecations,
      `${file} should keep baseUrl compatible with TypeScript 6`,
    ).toBe('6.0');
    expect(config.compilerOptions?.paths?.['@/*'], `${file} should resolve @/* into src/*`).toEqual(['./src/*']);
  }
});

test('ui primitive baseline is installed as local shadcn-backed source files', () => {
  const uiPrimitives = [
    'alert',
    'button',
    'checkbox',
    'dialog',
    'form',
    'input',
    'label',
    'radio-group',
    'select',
    'separator',
    'table',
    'tabs',
    'textarea',
  ];

  for (const primitive of uiPrimitives) {
    const file = `src/components/ui/${primitive}.tsx`;
    const source = readProjectFile(file);

    expect(existsSync(resolve(projectRoot, file)), `${file} should exist`).toBe(true);
    expect(source, `${file} should expose data-slot markers`).toContain('data-slot');
  }
});

test('admin routes stay thin and keep async state in module pages', () => {
  const routeFiles = readdirSync(adminRoutesDir).filter((file) => file.endsWith('.tsx'));
  const forbiddenRouteCouplings = [
    'useMutation',
    'useQuery(',
    'useQueryClient',
    'useSuspenseQuery',
    "from 'sonner'",
    'useTranslation',
  ];

  for (const file of routeFiles) {
    const source = readProjectFile(`src/routes/_auth/admin/${file}`);

    for (const forbidden of forbiddenRouteCouplings) {
      expect(source, `${file} should not contain ${forbidden}`).not.toContain(forbidden);
    }
  }
});

test('menu form options are driven by i18n keys instead of hardcoded Chinese labels', () => {
  const source = readProjectFile('src/modules/admin/pages/menus/MenuFormDialog.tsx');

  expect(source).not.toMatch(/label:\s*['"][\p{Script=Han}]/u);
  expect(source).not.toContain('根级菜单');
});

test('login page does not ship demo credentials as default field values', () => {
  const source = readProjectFile('src/routes/login.tsx');

  expect(source).not.toContain('password123');
  expect(source).not.toContain('leah@acme.com');
  expect(source).not.toContain('158 0611');
});

test('mock-only packages stay out of production dependencies', () => {
  const pkg = JSON.parse(readProjectFile('package.json')) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  expect(pkg.dependencies?.['@faker-js/faker']).toBeUndefined();
  expect(pkg.devDependencies?.['@faker-js/faker']).toBeDefined();
  expect(pkg.dependencies?.msw).toBeUndefined();
  expect(pkg.devDependencies?.msw).toBeDefined();
});

test('runtime env reads stay behind the config layer', () => {
  const allowed = new Set(['src/config/env.ts']);
  const sourceFiles = collectFiles(sourceRoot)
    .filter((file) => file.endsWith('.ts') || file.endsWith('.tsx'))
    .filter((file) => !file.includes('/__tests__/'))
    .map((file) => file.replace(`${projectRoot}/`, ''));

  for (const file of sourceFiles) {
    if (allowed.has(file)) continue;
    expect(readProjectFile(file), `${file} should import config instead of reading import.meta.env`).not.toContain(
      'import.meta.env',
    );
  }
});

test('admin api modules use runtime response contracts instead of ts-only http generics', () => {
  const apiFiles = readdirSync(adminApiDir)
    .filter((file) => file.endsWith('.api.ts'))
    .map((file) => `src/modules/admin/api/${file}`);

  for (const file of apiFiles) {
    const source = readProjectFile(file);

    expect(source, `${file} should pass a response contract to http calls`).not.toMatch(
      /http\.(get|post|put|patch|del)<[^>]+>/,
    );
  }
});

function collectFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(dir, entry.name);
    return entry.isDirectory() ? collectFiles(path) : [path];
  });
}
