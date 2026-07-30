import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseConfigFileTextToJson } from 'typescript';

const projectRoot = resolve(__dirname, '../../..');
const adminRoutesDir = resolve(projectRoot, 'src/routes/_auth/admin');
const adminApiDir = resolve(projectRoot, 'src/modules/admin/api');
const adminModulesDir = resolve(projectRoot, 'src/modules/admin');
const sourceRoot = resolve(projectRoot, 'src');
const themeStatesRoute = 'src/routes/_auth/dev/theme-states.tsx';

function readProjectFile(path: string) {
  return readFileSync(resolve(projectRoot, path), 'utf8');
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

test('permission presentation gates consume complete AuthzContext', () => {
  const violations = sourceFiles(sourceRoot)
    .filter((path) => !path.includes('/__tests__/'))
    .flatMap((path) => {
      const source = readFileSync(path, 'utf8');
      const legacyCalls = [...source.matchAll(/matchPermission\(\s*permissions\b/g)];
      // profile 无权限按钮，只消费账号自身数据，不需要 AuthzContext。
      const profileWithoutGates = path.endsWith('/routes/_auth/admin/profile.tsx');
      const incompleteMeProps = !profileWithoutGates && source.includes('permissions={me.permissions}') && !source.includes('systemAdmin={me.systemAdmin}');
      return legacyCalls.length || incompleteMeProps ? [path.replace(`${projectRoot}/`, '')] : [];
    });
  expect(violations).toEqual([]);
});

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

function getAdminRouteEntries() {
  return readdirSync(adminRoutesDir)
    .filter((file) => file.endsWith('.tsx'))
    .map((file) => ({
      route: `src/routes/_auth/admin/${file}`,
      page: file.replace(/\.tsx$/, ''),
    }));
}

function getAdminPageImport(page: string) {
  return page === 'dashboard' ? '@/modules/admin/pages/dashboard' : `@/modules/admin/${page}`;
}

function getAdminPageEntry(page: string) {
  return page === 'dashboard'
    ? 'src/modules/admin/pages/dashboard/index.tsx'
    : `src/modules/admin/${page}/index.tsx`;
}

test('admin routes import page entries from vertical packages except the dashboard legacy page', () => {
  const routeEntries = getAdminRouteEntries();

  for (const entry of routeEntries) {
    const source = readProjectFile(entry.route);

    expect(source).toContain(getAdminPageImport(entry.page));
    expect(source).not.toContain('@/modules/admin/components');
    if (entry.page !== 'dashboard') expect(source).not.toContain(`@/modules/admin/pages/${entry.page}`);
  }
});

test('admin business pages expose an index entry', () => {
  const pageEntries = getAdminRouteEntries().map((entry) => getAdminPageEntry(entry.page));

  for (const entry of pageEntries) {
    expect(existsSync(resolve(projectRoot, entry))).toBe(true);
  }
});

test('admin module does not keep legacy components page directories', () => {
  expect(existsSync(resolve(projectRoot, 'src/modules/admin/components'))).toBe(false);
});

test('only dashboard remains under the legacy horizontal pages directory', () => {
  // 止血守卫：pages/ 是待迁移的横切遗留，只允许 Dashboard；新业务必须走纵切 modules/<key>/<business>/。
  // 迁移完成后 pages/ 目录消失，本守卫自然放行。
  const legacyPagesDir = resolve(projectRoot, 'src/modules/admin/pages');
  if (!existsSync(legacyPagesDir)) return;

  const allowed = new Set(['dashboard']);
  const dirs = readdirSync(legacyPagesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  for (const dir of dirs) {
    expect(
      allowed.has(dir),
      `modules/admin/pages/${dir} 是横切遗留结构，新业务请用纵切 modules/<key>/<business>/`,
    ).toBe(true);
  }
});

test('roles and menus keep the required vertical package shape', () => {
  for (const business of ['roles', 'menus']) {
    const root = resolve(projectRoot, `src/modules/admin/${business}`);
    for (const path of [
      'index.tsx',
      'api/schema.ts',
      'api/keys.ts',
      'mocks/index.ts',
      'list',
      'detail',
      'form',
      '__tests__',
    ]) {
      expect(existsSync(resolve(root, path)), `${business}/${path} should exist`).toBe(true);
    }
  }
});

test('dictionaries is registered as a complete vertical business package', () => {
  const root = resolve(projectRoot, 'src/modules/admin/dictionaries');
  for (const path of [
    'index.tsx',
    'api/schema.ts',
    'api/keys.ts',
    'mocks/db.ts',
    'mocks/index.ts',
    'list',
    'detail',
    'form',
    '__tests__',
  ]) {
    expect(existsSync(resolve(root, path)), `dictionaries/${path} should exist`).toBe(true);
  }

  expect(existsSync(resolve(projectRoot, 'src/routes/_auth/admin/dictionaries.tsx'))).toBe(true);
  expect(readProjectFile('src/mocks/handlers.ts')).toContain('@/modules/admin/dictionaries/mocks');
});

test('dictionaries is declared in the admin manifest and permission catalog', () => {
  const manifest = readProjectFile('src/modules/admin/manifest.ts');
  const roleMock = readProjectFile('src/modules/admin/roles/mocks/role.handlers.ts');

  expect(manifest).toContain("path: '/admin/dictionaries'");
  expect(manifest).toContain("permission: 'sys:dict:view'");
  expect(roleMock).toContain("code: 'sys:dict'");
  expect(roleMock).toContain("id: 'audit:oplog'");
  expect(roleMock).toContain("'audit:oplog': ['view'");
  expect(roleMock).toContain("code: 'notice:msg'");
  expect(roleMock).not.toContain("code: 'notice:notice'");
});

test('implemented admin vertical packages are connected to mocks and navigation declarations', () => {
  const manifest = readProjectFile('src/modules/admin/manifest.ts');
  const handlers = readProjectFile('src/mocks/handlers.ts');
  const menuModel = readProjectFile('src/modules/admin/menus/model.ts');

  expect(handlers).toContain('@/modules/admin/messages/mocks');
  expect(handlers).toContain('@/modules/admin/logs/mocks');
  expect(handlers).toContain('@/modules/admin/files/mocks');
  expect(handlers).toContain('@/modules/admin/company/mocks');
  expect(handlers).toContain('@/modules/admin/profile/mocks');
  expect(manifest).toContain("path: '/admin/logs'");
  expect(manifest).toContain("permission: 'audit:oplog:view'");
  expect(manifest).toContain("path: '/admin/files'");
  expect(manifest).toContain("permission: 'file:doc:view'");
  expect(manifest).toContain("path: '/admin/company'");
  expect(manifest).toContain("permission: 'sys:org:view'");
  expect(menuModel).toContain("import { manifests } from '@/modules/registry'");
  expect(menuModel).toContain('for (const manifest of manifests)');
  expect(menuModel).toContain("menu.type !== 'menu'");
  expect(menuModel).not.toContain("value: '/admin/logs'");
});

test('visual workflow covers every completed Admin page and public auth screen', () => {
  const visual = readProjectFile('scripts/visual-agent-browser.mjs');
  for (const route of [
    '/admin/messages',
    '/admin/logs',
    '/admin/files',
    '/admin/company',
    '/admin/dictionaries',
    '/admin/profile',
    '/register',
    '/forgot-password',
  ]) {
    expect(visual).toContain(`url: '${route}'`);
  }
});

test('remaining admin features are owned by vertical business packages', () => {
  for (const business of ['messages', 'logs', 'files', 'company', 'profile', 'auth']) {
    const root = resolve(projectRoot, `src/modules/admin/${business}`);
    for (const path of [
      'index.tsx',
      'api/schema.ts',
      'api/keys.ts',
      'mocks/index.ts',
      'list',
      'detail',
      'form',
      '__tests__',
    ]) {
      expect(existsSync(resolve(root, path)), `${business}/${path} should exist`).toBe(true);
    }
  }

  for (const route of ['messages', 'logs', 'files', 'company', 'profile']) {
    expect(
      existsSync(resolve(projectRoot, `src/routes/_auth/admin/${route}.tsx`)),
      `${route} route should exist`,
    ).toBe(true);
  }
  expect(existsSync(resolve(projectRoot, 'src/routes/register.tsx'))).toBe(true);
  expect(existsSync(resolve(projectRoot, 'src/routes/forgot-password.tsx'))).toBe(true);
});

test('lastmile features use the complete vertical package shape', () => {
  for (const business of [
    'overview',
    'shipments',
    'customers',
    'channels',
    'carriers',
    'suppliers',
    'billing',
  ]) {
    const root = resolve(projectRoot, `src/modules/lastmile/${business}`);
    for (const path of [
      'index.tsx',
      'api/schema.ts',
      'api/keys.ts',
      'mocks/index.ts',
      'list',
      'detail',
      'form',
      '__tests__',
    ]) {
      expect(existsSync(resolve(root, path)), `${business}/${path} should exist`).toBe(true);
    }
  }

  expect(existsSync(resolve(projectRoot, 'src/modules/lastmile/pages'))).toBe(false);
  expect(existsSync(resolve(projectRoot, 'src/modules/lastmile/api'))).toBe(false);
});

test('lastmile is registered with routes, mocks, manifest and visual coverage', () => {
  const registry = readProjectFile('src/modules/registry.ts');
  const handlers = readProjectFile('src/mocks/handlers.ts');
  const manifest = readProjectFile('src/modules/lastmile/manifest.ts');
  const visual = readProjectFile('scripts/visual-agent-browser.mjs');

  expect(registry).toContain('lastmileManifest');
  for (const business of [
    'overview',
    'shipments',
    'customers',
    'channels',
    'carriers',
    'suppliers',
    'billing',
  ]) {
    expect(handlers).toContain(`@/modules/lastmile/${business}/mocks`);
  }
  for (const route of [
    '/lastmile/overview',
    '/lastmile/shipments',
    '/lastmile/customers',
    '/lastmile/channels',
    '/lastmile/carriers',
    '/lastmile/suppliers',
    '/lastmile/billing',
  ]) {
    expect(manifest).toContain(`path: '${route}'`);
    expect(visual).toContain(`url: '${route}'`);
  }
});

test('source tree does not keep unused starter assets or generated caches', () => {
  expect(existsSync(resolve(projectRoot, 'src/assets'))).toBe(false);
  expect(existsSync(resolve(projectRoot, 'src/node_modules'))).toBe(false);
});

test('theme states route is available for token slice verification', () => {
  expect(existsSync(resolve(projectRoot, themeStatesRoute))).toBe(true);
  expect(readProjectFile(themeStatesRoute)).toContain("createFileRoute('/_auth/dev/theme-states')");
  expect(readProjectFile('src/routeTree.gen.ts')).toContain("path: '/dev/theme-states'");
});

test('dev-only theme states route is gated out of production', () => {
  // 架构不变量：dev 组件画廊必须有环境门，否则任何登录用户直连 URL 即可访问。
  const source = readProjectFile(themeStatesRoute);

  expect(source).toContain('beforeLoad');
  expect(source).toContain('featuresConfig');
  expect(source).toMatch(/isDev|enableVisualDebug/);
  expect(source).toContain('notFound()');
});

test('theme states route exposes stable visual matrix controls', () => {
  const source = readProjectFile(themeStatesRoute);

  expect(source).toContain('data-matrix="flavor"');
  expect(source).toContain('data-matrix="mode"');
  expect(source).toContain('data-matrix="scale"');
  expect(source).toContain('value={zoom}');
  expect(source).toContain('set({ zoom:');
  expect(source).toContain('dev.themeStates.scale');
  expect(source).toContain('scaleLabelKeys');
  expect(source).toContain('shell.appearanceDrawer.zoomSm');
  expect(source).toContain('t(scaleLabelKeys[item])');
});

// —— 以下 theme-states 矩阵守卫是「实现快照」而非架构不变量 ——
// 它们逐字断言 /dev/theme-states 页展示了各组件族状态矩阵（AGENTS §9 要求每个 token 化组件族
// 在此有可截图矩阵）。代价是脆弱：重命名页内变量/类名会误红。保留是因为它们守护「矩阵完整性」；
// 若主题组件族 token 体系重估（AGENTS §9 标注的「第一个可重新评估的对象」），这批应一并改为
// 基于 data-testid 的稳定断言，而非逐字符串匹配。
test('theme states route exposes the Field family state matrix', () => {
  const source = readProjectFile(themeStatesRoute);

  expect(source).toContain('FieldGroup');
  expect(source).toContain('FieldError');
  expect(source).toContain('aria-invalid');
  expect(source).toContain('disabled');
  expect(source).toContain('readOnly');
  expect(source).toContain('addonBefore');
  expect(source).toContain('NativeSelect');
  expect(source).toContain('SelectControl');
  expect(source).toContain('Textarea');
});

test('theme states route exposes the Button family state matrix', () => {
  const source = readProjectFile(themeStatesRoute);

  expect(source).toContain('buttonVariantsForThemeStates');
  expect(source).toContain("'default'");
  expect(source).toContain("'danger-ghost'");
  expect(source).toContain('loading');
  expect(source).toContain('disabled');
});

test('theme states route exposes the Step 6 interaction state matrix', () => {
  const source = readProjectFile(themeStatesRoute);

  expect(source).toContain('TabsList');
  expect(source).toContain('AnimatedTabs');
  expect(source).toContain('animatedTabsValue');
  expect(source).toContain('Checkbox');
  expect(source).toContain('RadioGroup');
  expect(source).toContain('Switch');
  expect(source).toContain('Skeleton');
  expect(source).toContain('Empty');
  expect(source).toContain('step6Matrix');
  expect(source).toContain('skeletonPreview');
  expect(source).toContain('bg-surface p-4');
  expect(source).toContain('defaultValue="invalid"');
  expect(source).toContain('aria-invalid');
  expect(source).toContain('switchUnchecked');
  expect(source).toContain('switchDisabled');
});

test('theme states route exposes the Step 7 table and shell state matrix', () => {
  const source = readProjectFile(themeStatesRoute);

  expect(source).toContain('step7Matrix');
  expect(source).toContain('dataTableMatrix');
  expect(source).toContain('DataToolbar');
  expect(source).toContain('SummaryStrip');
  expect(source).toContain('DetailWorkspace');
  expect(source).toContain('Metric');
  expect(source).toContain('DataTable');
  expect(source).toContain('dataTableColumns');
  expect(source).toContain('dataTableRows');
  expect(source).toContain('dataTableLoading');
  expect(source).toContain('dataTableEmpty');
  expect(source).toContain('dataTableError');
  expect(source).toContain('QueryState');
  expect(source).toContain('queryStateMatrix');
  expect(source).toContain('TableShell');
  expect(source).toContain('TableShellHeader');
  expect(source).toContain('TableShellRow');
  expect(source).toContain('data-state="selected"');
  expect(source).toContain('SideList');
  expect(source).toContain('SideCardList');
  expect(source).toContain('PageThreePane');
  expect(source).toContain('data-testid="pageThreePaneMatrix"');
  expect(source).toContain('Pagination');
  expect(source).toContain('tableTokenRows');
  expect(source).toContain('shellTokenItems');
});

test('theme states route exposes the Tree state matrix', () => {
  const source = readProjectFile(themeStatesRoute);

  expect(source).toContain('Tree');
  expect(source).toContain('treeStateMatrix');
  expect(source).toContain('treeThemeNodes');
  expect(source).toContain('selectedId="rd"');
  expect(source).toContain('treeAriaLabel');
  expect(source).toContain('expanded: treeExpanded');
  expect(source).toContain('hidden: !treeExpanded');
  expect(source).toContain('variant="management"');
  expect(source).toContain('description: node.id');
  expect(source).toContain('leading:');
  expect(source).toContain('trailing:');
  expect(source).toContain('onToggle={() => setTreeExpanded');
});

test('theme states route exposes the Step 8 overlay and option state matrix', () => {
  const source = readProjectFile(themeStatesRoute);

  expect(source).toContain('step8OverlayOptionMatrix');
  expect(source).toContain('data-slot="popover-content"');
  expect(source).toContain('data-slot="select-content"');
  expect(source).toContain('data-slot="select-item"');
  expect(source).toContain('data-slot="dropdown-menu-content"');
  expect(source).toContain('data-slot="dropdown-menu-item"');
  expect(source).not.toContain('<Select open');
  expect(source).not.toContain('<Popover open');
  expect(source).not.toContain('<DropdownMenu open');
});

test('shell icon buttons do not override Button icon token colors', () => {
  const shellIconFiles = [
    'src/app/shell/widgets/LanguageMenu.tsx',
    'src/app/shell/widgets/AppearanceDrawer.tsx',
    'src/app/shell/widgets/DarkModeToggle.tsx',
    'src/app/shell/widgets/NotificationBell.tsx',
    'src/app/shell/layouts/InsetLayout.tsx',
  ];

  for (const file of shellIconFiles) {
    expect(readProjectFile(file), `${file} should not hard-code icon button text colors`).not.toContain(
      'text-text-2 hover:text-text-2',
    );
  }
});

test('root TypeScript configs expose the app alias for shadcn and external CLIs', () => {
  for (const file of ['tsconfig.json', 'tsconfig.app.json']) {
    const config = readTsConfig(file);

    expect(config.compilerOptions?.baseUrl, `${file} should expose the project root as baseUrl`).toBe('.');
    expect(
      config.compilerOptions?.ignoreDeprecations,
      `${file} should keep baseUrl compatible with TypeScript 6`,
    ).toBe('6.0');
    expect(config.compilerOptions?.paths?.['@/*'], `${file} should resolve @/* into src/*`).toEqual([
      './src/*',
    ]);
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

test('page and business layers do not bypass form primitives with raw text inputs', () => {
  const allowedRawInputFiles = new Set([
    'src/components/ui/checkbox.tsx',
    'src/components/ui/input.tsx',
    'src/components/ui/native-select.tsx',
    'src/components/ui/textarea.tsx',
    'src/app/shell/widgets/AppearanceDrawer.tsx',
  ]);
  const sourceFiles = collectFiles(sourceRoot)
    .filter((file) => file.endsWith('.tsx'))
    .filter((file) => !file.includes('/__tests__/'))
    .map((file) => file.replace(`${projectRoot}/`, ''));

  for (const file of sourceFiles) {
    if (allowedRawInputFiles.has(file)) continue;
    expect(
      readProjectFile(file),
      `${file} should use Input/InputGroup/SearchField instead of raw input`,
    ).not.toMatch(/<input\b/);
  }
});

test('admin auth pages do not bypass the shared Button primitive', () => {
  const authRoot = resolve(projectRoot, 'src/modules/admin/auth');
  const sourceFiles = collectFiles(authRoot)
    .filter((file) => file.endsWith('.tsx'))
    .filter((file) => !file.includes('/__tests__/'));

  for (const file of sourceFiles) {
    expect(
      readFileSync(file, 'utf8'),
      `${file.replace(`${projectRoot}/`, '')} should use the shared Button primitive`,
    ).not.toMatch(/<button\b/);
  }
});

test('completed vertical packages only consume query keys from their keys factories', () => {
  const packageRoots = [
    ...['auth', 'company', 'dictionaries', 'files', 'logs', 'menus', 'messages', 'profile', 'roles'].map(
      (business) => resolve(projectRoot, `src/modules/admin/${business}`),
    ),
    ...['overview', 'shipments', 'customers', 'channels', 'carriers', 'suppliers', 'billing'].map(
      (business) => resolve(projectRoot, `src/modules/lastmile/${business}`),
    ),
  ];

  for (const root of packageRoots) {
    const sourceFiles = collectFiles(root)
      .filter((file) => file.endsWith('.ts') || file.endsWith('.tsx'))
      .filter((file) => !file.includes('/__tests__/'))
      .filter((file) => !file.endsWith('/api/keys.ts'));
    for (const file of sourceFiles) {
      expect(
        readFileSync(file, 'utf8'),
        `${file.replace(`${projectRoot}/`, '')} should use its api/keys.ts factory`,
      ).not.toMatch(/queryKey:\s*\[/);
    }
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
  const path = 'src/modules/admin/menus/form/MenuFormDialog.tsx';
  if (!existsSync(resolve(projectRoot, path))) return;
  const source = readProjectFile(path);

  expect(source).not.toMatch(/label:\s*['"][\p{Script=Han}]/u);
  expect(source).not.toContain('根级菜单');
});

test('login page does not ship demo credentials as default field values', () => {
  const source = readProjectFile('src/modules/admin/auth/list/LoginScene.tsx');

  expect(source).not.toContain('password123');
  expect(source).not.toContain('leah@acme.com');
  expect(source).not.toContain('158 0611');
});

test('login route is a thin shell over the admin auth vertical package', () => {
  const source = readProjectFile('src/routes/login.tsx');

  expect(source).toContain('@/modules/admin/auth');
  for (const forbidden of ['useForm', 'useTranslation', 'authApi', 'resetSession', 'useState']) {
    expect(source).not.toContain(forbidden);
  }
});

test('authentication API and mocks are owned by the auth vertical package', () => {
  expect(existsSync(resolve(projectRoot, 'src/modules/admin/api/auth.api.ts'))).toBe(false);
  expect(existsSync(resolve(projectRoot, 'src/modules/admin/mocks/auth.handlers.ts'))).toBe(false);
  expect(readProjectFile('src/modules/admin/auth/api/index.ts')).toContain("export * from './session'");
  expect(readProjectFile('src/mocks/handlers.ts')).toContain('@/modules/admin/auth/mocks');
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

test('global mock aggregation imports users handlers from the vertical module', () => {
  const source = readProjectFile('src/mocks/handlers.ts');

  expect(source).toContain('@/modules/admin/users/mocks');
  expect(source).toContain('usersModuleHandlers');
  expect(source).not.toContain('@/modules/admin/mocks/user.handlers');
});

test('global mock aggregation imports roles and menus handlers from their vertical modules', () => {
  const source = readProjectFile('src/mocks/handlers.ts');

  expect(source).toContain('@/modules/admin/roles/mocks');
  expect(source).toContain('@/modules/admin/menus/mocks');
  expect(source).not.toContain('@/modules/admin/mocks/role.handlers');
  expect(source).not.toContain('@/modules/admin/mocks/menu.handlers');
});

test('runtime env reads stay behind the config layer', () => {
  const allowed = new Set(['src/config/env.ts']);
  const sourceFiles = collectFiles(sourceRoot)
    .filter((file) => file.endsWith('.ts') || file.endsWith('.tsx'))
    .filter((file) => !file.includes('/__tests__/'))
    .map((file) => file.replace(`${projectRoot}/`, ''));

  for (const file of sourceFiles) {
    if (allowed.has(file)) continue;
    expect(
      readProjectFile(file),
      `${file} should import config instead of reading import.meta.env`,
    ).not.toContain('import.meta.env');
  }
});

test('admin api modules use runtime response contracts instead of ts-only http generics', () => {
  const legacyApiFiles = readdirSync(adminApiDir)
    .filter((file) => file.endsWith('.api.ts'))
    .map((file) => `src/modules/admin/api/${file}`);
  const verticalApiFiles = collectFiles(adminModulesDir)
    .filter((file) => file.endsWith('.ts'))
    .filter((file) => file.includes('/api/'))
    .filter((file) => !file.includes('/__tests__/'))
    .map((file) => file.replace(`${projectRoot}/`, ''));
  const apiFiles = [...legacyApiFiles, ...verticalApiFiles];

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
