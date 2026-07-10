import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const projectRoot = resolve(__dirname, '../../../../..');
const menusRoot = resolve(projectRoot, 'src/modules/admin/menus');

function read(path: string) {
  return readFileSync(resolve(projectRoot, path), 'utf8');
}

test('menus index is a UI skeleton and data orchestration lives in a scene', () => {
  const source = read('src/modules/admin/menus/index.tsx');

  expect(source).not.toMatch(/use(Query|SuspenseQuery|Mutation|QueryClient)\b/);
  expect(existsSync(resolve(menusRoot, 'list/MenusScene.tsx'))).toBe(true);
});

test('menus vertical module owns schema, keys and resettable mock db', () => {
  for (const path of ['api/schema.ts', 'api/keys.ts', 'mocks/db.ts', 'mocks/index.ts']) {
    expect(existsSync(resolve(menusRoot, path)), `menus/${path} should exist`).toBe(true);
  }
});

test('menus no longer depends on legacy horizontal menu files', () => {
  expect(existsSync(resolve(projectRoot, 'src/modules/admin/api/menu.api.ts'))).toBe(false);
  expect(existsSync(resolve(projectRoot, 'src/modules/admin/mocks/menu.handlers.ts'))).toBe(false);
  expect(existsSync(resolve(projectRoot, 'src/modules/admin/pages/menus'))).toBe(false);
});

test('menu and subsystem forms use focused RHF hooks instead of local draft state', () => {
  const menuHook = resolve(menusRoot, 'form/useMenuForm.ts');
  const subsystemHook = resolve(menusRoot, 'form/useSubsystemForm.ts');
  const subsystemDialog = resolve(menusRoot, 'form/SubsystemFormDialog.tsx');

  expect(existsSync(menuHook)).toBe(true);
  expect(existsSync(subsystemHook)).toBe(true);
  expect(existsSync(subsystemDialog)).toBe(true);

  const menuDialogSource = readFileSync(resolve(menusRoot, 'form/MenuFormDialog.tsx'), 'utf8');
  const subsystemDialogSource = readFileSync(subsystemDialog, 'utf8');
  expect(menuDialogSource).toContain('useMenuForm');
  expect(subsystemDialogSource).toContain('useSubsystemForm');
  expect(menuDialogSource).not.toMatch(/\buseState\b/);
  expect(subsystemDialogSource).not.toMatch(/\buseState\b/);
});

test('menus production components are split by scene, workspace, detail and form responsibility', () => {
  const expectedFiles = [
    'list/MenusView.tsx',
    'list/MenuWorkspace.tsx',
    'list/MenuOverlays.tsx',
    'list/MenuTree.tsx',
    'list/SubsystemPanel.tsx',
    'detail/MenuInspector.tsx',
    'detail/MenuActionList.tsx',
  ];

  for (const path of expectedFiles) {
    expect(existsSync(resolve(menusRoot, path)), `menus/${path} should exist`).toBe(true);
  }
});

test('menus view tests are split by behavior boundary', () => {
  const expectedFiles = [
    '__tests__/MenusView.behavior.test.tsx',
    '__tests__/MenusView.interactions.test.tsx',
    '__tests__/MenusView.menu-form.test.tsx',
    '__tests__/MenusView.subsystem-form.test.tsx',
    '__tests__/menus-view.test-kit.tsx',
  ];

  for (const path of expectedFiles) {
    const file = resolve(menusRoot, path);
    expect(existsSync(file), `menus/${path} should exist`).toBe(true);
    expect(readFileSync(file, 'utf8').split('\n').length, `menus/${path} should stay focused`).toBeLessThan(200);
  }
});

test('menus visual scale workflow exercises the unified edit dialog', () => {
  const source = read('scripts/visual-agent-browser.mjs');

  expect(source).toContain('assertMenuDialog');
  expect(source).toContain('menusDialog');
  expect(source).not.toContain('assertMenuInlineEditor');
  expect(source).not.toContain('menu-inline-editor');
});

test('menus business components do not own visual state classes or oversized files', () => {
  const files = [
    'list/MenusScene.tsx',
    'list/MenusView.tsx',
    'list/MenuWorkspace.tsx',
    'list/MenuOverlays.tsx',
    'list/MenuTree.tsx',
    'list/SubsystemPanel.tsx',
    'detail/MenuInspector.tsx',
    'detail/MenuActionList.tsx',
    'form/MenuFormDialog.tsx',
    'form/SubsystemFormDialog.tsx',
  ];

  for (const path of files) {
    const file = resolve(menusRoot, path);
    if (!existsSync(file)) continue;
    const source = readFileSync(file, 'utf8');
    expect(source.split('\n').length, `menus/${path} should stay focused`).toBeLessThanOrEqual(250);
    expect(source, `menus/${path} should delegate visual state to UI/Pro`).not.toMatch(
      /(?:bg-|rounded-|shadow-|hover:|focus:|transition-|duration-|text-(?:text|danger|warning|success))/,
    );
    expect(source).not.toContain('style={{');
  }
});
