import { spawn, spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const viewport = { width: 1440, height: 900 };
const baselineDir = path.join(root, 'e2e', 'baseline');
const reportDir = path.join(root, 'test-results', 'm0-visual');
const baseUrl = process.env.M0_VISUAL_BASE_URL ?? 'http://127.0.0.1:5173';
const baseOrigin = new URL(baseUrl).origin;
const baseHost = new URL(baseUrl).hostname || '127.0.0.1';
const basePort = new URL(baseUrl).port || '5173';
const runId = process.env.M0_VISUAL_RUN_ID ?? String(Date.now());
const prototypeSession = `m0-prototype-${runId}`;
const appSession = `m0-app-${runId}`;
const strictVisual = process.env.M0_VISUAL_STRICT === 'true';

const appearanceState = {
  flavor: 'feishu',
  mode: 'light',
  accent: 'blue',
  customAccent: '#c96442',
  zoom: 'md',
  radius: 'default',
  layout: 'sidebar',
  pageAnim: 'fade',
  collapsed: {},
  _priResolved: '#3370ff',
  _priSoftResolved: '#eef3ff',
};

const prototypeScenarios = [
  { key: 'login', file: 'prototype-login.png' },
  { key: 'dashboard', file: 'prototype-dashboard.png' },
  { key: 'users', file: 'prototype-users.png' },
  { key: 'roles', file: 'prototype-roles.png' },
  { key: 'menus', file: 'prototype-menus.png' },
];

const appScenarios = [
  { key: 'login', file: 'app-login.png', url: '/login', requiresAuth: false },
  { key: 'dashboard', file: 'app-dashboard.png', url: '/admin/dashboard', requiresAuth: true },
  { key: 'users', file: 'app-users.png', url: '/admin/users?page=1&pageSize=10&status=all&keyword=', requiresAuth: true },
  { key: 'roles', file: 'app-roles.png', url: '/admin/roles', requiresAuth: true },
  { key: 'menus', file: 'app-menus.png', url: '/admin/menus', requiresAuth: true },
];

function agent(session, args, options = {}) {
  const globalArgs = ['--session', session];
  if (options.allowFileAccess) globalArgs.push('--allow-file-access');
  if (options.json) globalArgs.push('--json');

  const result = spawnSync('agent-browser', [...globalArgs, ...args], {
    cwd: root,
    encoding: 'utf8',
    input: options.input,
  });

  if (result.status !== 0 && !options.allowFailure) {
    const details = [result.stdout, result.stderr].filter(Boolean).join('\n');
    throw new Error(`agent-browser ${args.join(' ')} failed\n${details}`);
  }

  return {
    ok: result.status === 0,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
  };
}

function evalIn(session, script, options = {}) {
  return agent(session, ['eval', '--stdin'], { ...options, input: `(() => {\n${script}\n})()` });
}

async function ensureDir(dir) {
  await mkdir(dir, { recursive: true });
}

async function isUrlReady(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 800);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function isAppServerReady() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1000);
  try {
    const response = await fetch(new URL('/', baseOrigin), { signal: controller.signal });
    if (!response.ok) return false;
    const html = await response.text();
    return html.includes('name="m0-app-id" content="admin-scaffold-frontend"');
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function waitForServer(url, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isUrlReady(url)) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`dev server not ready: ${url}`);
}

async function ensureDevServer() {
  const loginUrl = new URL('/login', baseOrigin).href;
  if ((await isUrlReady(loginUrl)) && (await isAppServerReady())) {
    return { reused: true, stop: async () => undefined };
  }
  if (await isUrlReady(loginUrl)) {
    throw new Error(`${baseOrigin} is responding but is not this M0 app. Stop that server or set M0_VISUAL_BASE_URL to a free local port.`);
  }

  const viteBin = path.join(root, 'node_modules', '.bin', 'vite');
  const child = spawn(viteBin, ['--host', baseHost, '--port', basePort], {
    cwd: root,
    env: { ...process.env, VITE_ENABLE_MOCK: 'true' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.on('data', (chunk) => {
    if (process.env.M0_VISUAL_VERBOSE === 'true') process.stdout.write(chunk);
  });
  child.stderr.on('data', (chunk) => {
    if (process.env.M0_VISUAL_VERBOSE === 'true') process.stderr.write(chunk);
  });

  await waitForServer(loginUrl);
  if (!(await isAppServerReady())) {
    throw new Error(`dev server started at ${baseOrigin}, but app fingerprint was not found`);
  }
  return {
    reused: false,
    stop: async () => {
      child.kill('SIGTERM');
      await new Promise((resolve) => child.once('exit', resolve));
    },
  };
}

function setViewport(session) {
  agent(session, ['set', 'viewport', String(viewport.width), String(viewport.height)]);
}

function clickPrototypeText(session, text) {
  evalIn(
    session,
    `
    const matches = [...document.querySelectorAll('div,button,span')].filter((el) => {
      const label = el.textContent?.replace(/\\s+/g, ' ').trim() || '';
      return label.includes(${JSON.stringify(text)});
    }).sort((a, b) => {
      const ar = a.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      return ar.width * ar.height - br.width * br.height;
    });
    const target = matches.find((el) => getComputedStyle(el).pointerEvents !== 'none') || matches[0];
    if (!target) throw new Error('prototype text not found: ${text}');
    target.click();
    true;
    `,
  );
}

function assertPrototypeScreen(session, key) {
  const expectedText = {
    login: '欢迎回来',
    dashboard: '小倪科技',
    users: '成员与部门',
    roles: '角色与权限',
    menus: '子系统管理',
  }[key];
  evalIn(
    session,
    `
    const bodyText = document.body.innerText;
    if (!bodyText.includes(${JSON.stringify(expectedText)})) {
      throw new Error('prototype assertion failed for ${key}: missing ${expectedText}');
    }
    true;
    `,
  );
}

async function capturePrototypeBaselines() {
  await ensureDir(baselineDir);
  setViewport(prototypeSession);
  const prototypeUrl = pathToFileURL(path.join(root, '后台管理脚手架.dc.html')).href;
  const manifest = [];

  for (const scenario of prototypeScenarios) {
    agent(prototypeSession, ['open', prototypeUrl], { allowFileAccess: true });
    setViewport(prototypeSession);
    evalIn(
      prototypeSession,
      `
      const rootName = window.__dcRootName?.();
      if (!rootName || typeof window.__dcSetProps !== 'function') {
        throw new Error('Design Component runtime not ready');
      }
      window.__dcSetProps(rootName, ${JSON.stringify({
        defaultFlavor: 'feishu',
        defaultLayout: 'sidebar',
        defaultPage: 'dashboard',
        flavor: 'feishu',
        dark: false,
        density: 'md',
        radius: 'default',
      })});
      document.documentElement.dataset.visualScenario = ${JSON.stringify(scenario.key)};
      rootName;
      `,
    );
    if (scenario.key === 'users') {
      clickPrototypeText(prototypeSession, '成员与部门');
    }
    if (scenario.key === 'roles') {
      clickPrototypeText(prototypeSession, '角色与权限');
    }
    if (scenario.key === 'menus') {
      clickPrototypeText(prototypeSession, '菜单管理');
    }
    if (scenario.key === 'login') {
      clickPrototypeText(prototypeSession, '李长昕');
      agent(prototypeSession, ['wait', '250']);
      clickPrototypeText(prototypeSession, '退出登录');
    }
    agent(prototypeSession, ['wait', '700']);
    assertPrototypeScreen(prototypeSession, scenario.key);
    const output = path.join(baselineDir, scenario.file);
    agent(prototypeSession, ['screenshot', output]);
    manifest.push({
      key: scenario.key,
      file: path.relative(root, output),
      source: '后台管理脚手架.dc.html',
      viewport,
    });
  }

  await writeFile(
    path.join(baselineDir, 'manifest.json'),
    `${JSON.stringify({ scenarios: manifest }, null, 2)}\n`,
  );
  return manifest;
}

function resetAppState(session) {
  evalIn(
    session,
    `
    localStorage.clear();
    localStorage.setItem('appearance', JSON.stringify({ state: ${JSON.stringify(appearanceState)}, version: 0 }));
    document.documentElement.dataset.flavor = 'feishu';
    document.documentElement.dataset.mode = 'light';
    delete document.documentElement.dataset.zoom;
    delete document.documentElement.dataset.radius;
    document.documentElement.style.setProperty('--pri', '#3370ff');
    document.documentElement.style.setProperty('--pri-soft', '#eef3ff');
    true;
    `,
  );
}

function waitForLoginForm(session) {
  for (let i = 0; i < 20; i += 1) {
    const result = evalIn(
      session,
      `
      const inputs = [...document.querySelectorAll('input')];
      const form = document.querySelector('form');
      if (inputs.length >= 2 && form) return true;
      throw new Error('login form not ready yet');
      `,
      { allowFailure: true },
    );
    if (result.ok) return;
    agent(session, ['wait', '250']);
  }
  throw new Error('login form not ready after waiting');
}

function loginAsAdmin(session) {
  agent(session, ['open', new URL('/login', baseOrigin).href]);
  agent(session, ['wait', '300']);
  resetAppState(session);
  agent(session, ['open', new URL('/login', baseOrigin).href]);
  waitForLoginForm(session);
  evalIn(
    session,
    `
    const inputs = [...document.querySelectorAll('input')];
    const form = document.querySelector('form');
    if (inputs.length < 2 || !form) throw new Error('login form not ready');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    if (!setter) throw new Error('native input setter not found');
    setter.call(inputs[0], 'admin');
    inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
    inputs[0].dispatchEvent(new Event('change', { bubbles: true }));
    setter.call(inputs[1], 'admin123');
    inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
    inputs[1].dispatchEvent(new Event('change', { bubbles: true }));
    form.requestSubmit();
    true;
    `,
  );
  agent(session, ['wait', '1500']);
  evalIn(
    session,
    `
    const auth = JSON.parse(localStorage.getItem('auth') || '{}');
    if (!auth.state?.token) throw new Error('login did not persist auth token');
    true;
    `,
  );
}

function assertAppScreen(session, key) {
  const expectedText = {
    login: '登录',
    dashboard: '小倪科技',
    users: '成员与部门',
    roles: '角色与权限',
    menus: '子系统管理',
  }[key];
  evalIn(
    session,
    `
    const bodyText = document.body.innerText;
    if (bodyText.includes('Something went wrong')) {
      throw new Error('screen entered error boundary: ' + bodyText.slice(0, 180));
    }
    if (!bodyText.includes(${JSON.stringify(expectedText)})) {
      throw new Error('screen assertion failed for ${key}: missing ${expectedText}');
    }
    true;
    `,
  );
}

async function captureAppScreens() {
  await ensureDir(reportDir);
  const server = await ensureDevServer();
  const captures = [];
  const diffs = [];

  try {
    setViewport(appSession);
    agent(appSession, ['open', new URL('/login', baseOrigin).href]);
    agent(appSession, ['wait', '700']);
    resetAppState(appSession);
    agent(appSession, ['open', new URL('/login', baseOrigin).href]);
    agent(appSession, ['wait', '700']);

    for (const scenario of appScenarios) {
      if (scenario.requiresAuth) {
        loginAsAdmin(appSession);
      }
      agent(appSession, ['open', new URL(scenario.url, baseOrigin).href]);
      agent(appSession, ['wait', '1200']);
      assertAppScreen(appSession, scenario.key);

      const output = path.join(reportDir, scenario.file);
      agent(appSession, ['screenshot', output]);
      captures.push({ key: scenario.key, file: path.relative(root, output), url: scenario.url, viewport });

      const baseline = path.join(baselineDir, `prototype-${scenario.key}.png`);
      const diffOutput = path.join(reportDir, `diff-${scenario.key}.png`);
      const diff = agent(
        appSession,
        ['diff', 'screenshot', '--baseline', baseline, '--output', diffOutput, '--threshold', '0.1'],
        { allowFailure: true },
      );
      const diffOutputText = [diff.stdout, diff.stderr].filter(Boolean).join('\n');
      const visualMatch = diff.ok && !diffOutputText.includes('pixels differ') && !diffOutputText.includes('✗');
      diffs.push({
        key: scenario.key,
        ok: visualMatch,
        baseline: path.relative(root, baseline),
        diff: path.relative(root, diffOutput),
        output: diffOutputText,
      });
      if (strictVisual && !visualMatch) {
        throw new Error(`strict visual diff failed: ${scenario.key}\n${diffs.at(-1).output}`);
      }
    }

    return { captures, diffs, serverReused: server.reused };
  } finally {
    await server.stop();
  }
}

function setZoom(session, zoom) {
  const next = { ...appearanceState, zoom };
  evalIn(
    session,
    `
    localStorage.setItem('appearance', JSON.stringify({ state: ${JSON.stringify(next)}, version: 0 }));
    document.documentElement.dataset.flavor = 'feishu';
    document.documentElement.dataset.mode = 'light';
    if (${JSON.stringify(zoom)} === 'md') delete document.documentElement.dataset.zoom;
    else document.documentElement.dataset.zoom = ${JSON.stringify(zoom)};
    delete document.documentElement.dataset.radius;
    document.documentElement.style.setProperty('--pri', '#3370ff');
    document.documentElement.style.setProperty('--pri-soft', '#eef3ff');
    true;
    `,
  );
}

function assertNoHorizontalOverflow(session) {
  evalIn(
    session,
    `
    const overflow = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth;
    if (overflow > 1) throw new Error('horizontal overflow: ' + overflow);
    overflow;
    `,
  );
}

function assertSeraComputedContracts(session) {
  evalIn(
    session,
    `
    const isTransparent = (value) => value === 'transparent' || value === 'rgba(0, 0, 0, 0)';
    const badge = document.querySelector('[data-testid="badgeMatrix"] [data-slot="badge"]');
    const field = document.querySelector('#theme-field-default');
    const button = document.querySelector('[data-slot="button"][data-variant="primary"]');
    const card = document.querySelector('[data-testid="card-full"]');

    if (!badge) throw new Error('sera computed contract failed: badge target not found');
    if (!field) throw new Error('sera computed contract failed: field target not found');
    if (!button) throw new Error('sera computed contract failed: primary button target not found');
    if (!card) throw new Error('sera computed contract failed: card target not found');

    const badgeStyle = getComputedStyle(badge);
    const fieldStyle = getComputedStyle(field);
    const buttonStyle = getComputedStyle(button);
    const cardStyle = getComputedStyle(card);

    if (!isTransparent(badgeStyle.backgroundColor)) {
      throw new Error('sera computed contract failed: badge background expected transparent, got ' + badgeStyle.backgroundColor);
    }
    if (!isTransparent(fieldStyle.borderTopColor) || !isTransparent(fieldStyle.borderRightColor) || !isTransparent(fieldStyle.borderLeftColor)) {
      throw new Error(
        'sera computed contract failed: field side borders expected transparent, got ' +
          [fieldStyle.borderTopColor, fieldStyle.borderRightColor, fieldStyle.borderLeftColor].join(' / '),
      );
    }
    if (isTransparent(fieldStyle.borderBottomColor)) {
      throw new Error('sera computed contract failed: field bottom border should be visible');
    }
    if (buttonStyle.textTransform !== 'uppercase') {
      throw new Error('sera computed contract failed: button textTransform expected uppercase, got ' + buttonStyle.textTransform);
    }
    if (Number.parseFloat(cardStyle.paddingTop) < 28) {
      throw new Error('sera computed contract failed: card paddingTop expected >= 28px, got ' + cardStyle.paddingTop);
    }
    true;
    `,
  );
}

function assertStatusPopover(session) {
  evalIn(
    session,
    `
    const button = [...document.querySelectorAll('button')].find((item) => item.textContent?.includes('账号状态'));
    if (!button) throw new Error('status filter button not found');
    button.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      buttons: 1,
    }));
    button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0, buttons: 1 }));
    button.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, button: 0 }));
    button.click();
    true;
    `,
  );
  agent(session, ['wait', '300']);
  evalIn(
    session,
    `
    const candidates = [...document.querySelectorAll('[data-slot="dropdown-menu-content"], [data-slot="select-content"], [data-radix-popper-content-wrapper]')]
      .filter((el) => el.textContent?.includes('停用') && el.textContent?.includes('未激活'));
    const popover = candidates[0];
    if (!popover) throw new Error('status popover not found');
    const rect = popover.getBoundingClientRect();
    if (rect.left < -1 || rect.top < -1 || rect.right > window.innerWidth + 1 || rect.bottom > window.innerHeight + 1) {
      throw new Error('status popover out of viewport: ' + JSON.stringify(rect.toJSON()));
    }
    rect.toJSON();
    `,
  );
}

function assertDetailSheet(session) {
  agent(session, ['press', 'Escape'], { allowFailure: true });
  agent(session, ['wait', '100']);
  evalIn(
    session,
    `
    const detailButton = [...document.querySelectorAll('button')].find((item) => item.textContent?.trim() === '详情');
    if (!detailButton) throw new Error('detail button not found');
    detailButton.click();
    true;
    `,
  );
  agent(session, ['wait', '500']);
  evalIn(
    session,
    `
    const sheet = document.querySelector('[data-slot="sheet-content"]');
    if (!sheet) throw new Error('detail sheet not found');
    const rect = sheet.getBoundingClientRect();
    if (rect.left < -1 || rect.top < -1 || rect.right > window.innerWidth + 1 || rect.bottom > window.innerHeight + 1) {
      throw new Error('sheet out of viewport: ' + JSON.stringify(rect.toJSON()));
    }
    rect.toJSON();
    `,
  );
}

function assertRoleDialog(session) {
  evalIn(
    session,
    `
    const adminTab = [...document.querySelectorAll('button')].find((item) => item.textContent?.trim() === '管理员权限');
    if (!adminTab) throw new Error('admin permissions tab not found');
    adminTab.click();
    true;
    `,
  );
  agent(session, ['wait', '300']);
  evalIn(
    session,
    `
    const createButton = [...document.querySelectorAll('button')].find((item) => item.textContent?.includes('创建管理员角色'));
    if (!createButton) throw new Error('create admin role button not found');
    createButton.click();
    true;
    `,
  );
  agent(session, ['wait', '400']);
  evalIn(
    session,
    `
    const dialog = document.querySelector('[role="dialog"]');
    if (!dialog || !dialog.textContent?.includes('创建管理员角色')) throw new Error('admin role dialog not found');
    const rect = dialog.getBoundingClientRect();
    if (rect.left < -1 || rect.top < -1 || rect.right > window.innerWidth + 1 || rect.bottom > window.innerHeight + 1) {
      throw new Error('role dialog out of viewport: ' + JSON.stringify(rect.toJSON()));
    }
    rect.toJSON();
    `,
  );
}

function assertMenuDialog(session) {
  evalIn(
    session,
    `
    const editButton = [...document.querySelectorAll('button')].find((item) => item.getAttribute('aria-label') === '编辑企业概览');
    if (!editButton) throw new Error('edit overview menu button not found');
    editButton.click();
    true;
    `,
  );
  agent(session, ['wait', '400']);
  evalIn(
    session,
    `
    const dialog = document.querySelector('[role="dialog"]');
    if (!dialog || !dialog.textContent?.includes('编辑菜单')) throw new Error('menu dialog not found');
    const rect = dialog.getBoundingClientRect();
    if (rect.left < -1 || rect.top < -1 || rect.right > window.innerWidth + 1 || rect.bottom > window.innerHeight + 1) {
      throw new Error('menu dialog out of viewport: ' + JSON.stringify(rect.toJSON()));
    }
    const normalize = (value) => value?.replace(/\\s+/g, '').trim() || '';
    const measureButton = (name) => {
      const button = [...document.querySelectorAll('[data-slot="button"]')].find((item) => normalize(item.textContent).includes(name));
      if (!button) throw new Error('menu dialog button not found: ' + name);
      const buttonRect = button.getBoundingClientRect();
      const style = getComputedStyle(button);
      return {
        name,
        dataSize: button.getAttribute('data-size'),
        height: Number(buttonRect.height.toFixed(2)),
        paddingLeft: Number.parseFloat(style.paddingLeft).toFixed(2),
        paddingRight: Number.parseFloat(style.paddingRight).toFixed(2),
        fontSize: Number.parseFloat(style.fontSize).toFixed(2),
      };
    };
    const measureControl = (element, name) => {
      const controlRect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        name,
        height: Number(controlRect.height.toFixed(2)),
        fontSize: Number.parseFloat(style.fontSize).toFixed(2),
      };
    };
    const assertSameMetrics = (label, items, pick) => {
      const comparable = items.map(pick);
      const first = JSON.stringify(comparable[0]);
      for (const item of comparable) {
        if (JSON.stringify(item) !== first) {
          throw new Error(label + ' metrics mismatch: ' + JSON.stringify(items));
        }
      }
      return comparable[0];
    };
    const toolbar = [measureButton('展开'), measureButton('折叠'), measureButton('新增菜单')];
    const dialogFooter = [measureButton('取消'), measureButton('保存菜单')];
    const formControls = [
      ...[...dialog.querySelectorAll('[data-slot="select-trigger"]')].map((item, index) => measureControl(item, 'select-' + index)),
      ...[...dialog.querySelectorAll('[data-slot="input"]')].map((item, index) => measureControl(item, 'input-' + index)),
    ];
    if (formControls.length < 2) throw new Error('menu form controls not found for scale check');
    const appScale = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--app-scale')) || 1;
    const toolbarMetrics = assertSameMetrics('menu toolbar buttons', toolbar, ({ dataSize, height, paddingLeft, paddingRight, fontSize }) => ({
      dataSize,
      height,
      paddingLeft,
      paddingRight,
      fontSize,
    }));
    const formMetrics = assertSameMetrics('menu form controls and actions', [...formControls, ...dialogFooter], ({ height, fontSize }) => ({
      height,
      fontSize,
    }));
    const expectedToolbarHeight = 30 * appScale;
    const expectedFormHeight = 36 * appScale;
    if (Math.abs(toolbarMetrics.height - expectedToolbarHeight) > 0.2) {
      throw new Error(
        'menu toolbar button height does not follow app scale: ' +
          JSON.stringify({ appScale, expectedToolbarHeight, toolbar }),
      );
    }
    if (Math.abs(formMetrics.height - expectedFormHeight) > 0.2) {
      throw new Error(
        'menu form control/action height does not follow app scale: ' +
          JSON.stringify({ appScale, expectedFormHeight, formControls, dialogFooter }),
      );
    }
    ({ rect: rect.toJSON(), toolbar, formControls, dialogFooter });
    `,
  );
}

async function runScaleChecks() {
  await ensureDir(reportDir);
  const server = await ensureDevServer();
  const results = [];

  try {
    setViewport(appSession);
    loginAsAdmin(appSession);

    for (const zoom of ['sm', 'md', 'lg']) {
      agent(appSession, ['open', new URL('/admin/users?page=1&pageSize=10&status=all&keyword=', baseOrigin).href]);
      agent(appSession, ['wait', '1000']);
      setZoom(appSession, zoom);
      agent(appSession, ['wait', '300']);
      assertNoHorizontalOverflow(appSession);
      assertStatusPopover(appSession);
      const popoverShot = path.join(reportDir, `app-users-${zoom}-popover.png`);
      agent(appSession, ['screenshot', popoverShot]);
      assertDetailSheet(appSession);
      const sheetShot = path.join(reportDir, `app-users-${zoom}-sheet.png`);
      agent(appSession, ['screenshot', sheetShot]);
      agent(appSession, ['press', 'Escape'], { allowFailure: true });

      agent(appSession, ['open', new URL('/admin/roles', baseOrigin).href]);
      agent(appSession, ['wait', '1000']);
      setZoom(appSession, zoom);
      agent(appSession, ['wait', '300']);
      assertNoHorizontalOverflow(appSession);
      assertRoleDialog(appSession);
      const rolesShot = path.join(reportDir, `app-roles-${zoom}-dialog.png`);
      agent(appSession, ['screenshot', rolesShot]);
      agent(appSession, ['press', 'Escape'], { allowFailure: true });

      agent(appSession, ['open', new URL('/admin/menus', baseOrigin).href]);
      agent(appSession, ['wait', '1000']);
      setZoom(appSession, zoom);
      agent(appSession, ['wait', '300']);
      assertNoHorizontalOverflow(appSession);
      assertMenuDialog(appSession);
      const menusShot = path.join(reportDir, `app-menus-${zoom}-dialog.png`);
      agent(appSession, ['screenshot', menusShot]);
      agent(appSession, ['press', 'Escape'], { allowFailure: true });

      results.push({
        zoom,
        popover: path.relative(root, popoverShot),
        sheet: path.relative(root, sheetShot),
        rolesDialog: path.relative(root, rolesShot),
        menusDialog: path.relative(root, menusShot),
        assertions: [
          'no horizontal overflow',
          'status popover in viewport',
          'detail sheet in viewport',
          'roles dialog in viewport',
          'menus dialog in viewport',
        ],
      });
    }

    return { results, serverReused: server.reused };
  } finally {
    await server.stop();
  }
}

function setMatrixSelect(session, matrixKey, value) {
  evalIn(
    session,
    `
    const el = document.querySelector('select[data-matrix=${JSON.stringify(matrixKey)}]');
    if (!el) throw new Error('matrix select not found: ${matrixKey}');
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
    if (!setter) throw new Error('native select setter not found');
    setter.call(el, ${JSON.stringify(value)});
    el.dispatchEvent(new Event('change', { bubbles: true }));
    true;
    `,
  );
}

function assertThemeMatrixReady(session) {
  evalIn(
    session,
    `
    const selects = [...document.querySelectorAll('select[data-matrix]')];
    if (selects.length !== 3) {
      throw new Error('theme matrix ready failed: expected 3 matrix selects, got ' + selects.length);
    }
    const expected = { flavor: 4, mode: 2, scale: 3 };
    for (const [key, expectedCount] of Object.entries(expected)) {
      const select = document.querySelector('select[data-matrix="' + key + '"]');
      if (!select) throw new Error('theme matrix ready failed: missing select ' + key);
      const actualCount = select.options.length;
      if (actualCount !== expectedCount) {
        throw new Error('theme matrix ready failed: select ' + key + ' expected ' + expectedCount + ' options, got ' + actualCount);
      }
    }
    true;
    `,
  );
}

function assertMatrixStateApplied(session, expected) {
  evalIn(
    session,
    `
    const expected = ${JSON.stringify(expected)};
    const selectValue = (key) => document.querySelector('select[data-matrix="' + key + '"]')?.value ?? '';
    const actual = {
      flavor: selectValue('flavor'),
      mode: selectValue('mode'),
      scale: selectValue('scale'),
      datasetFlavor: document.documentElement.dataset.flavor ?? '',
      datasetMode: document.documentElement.dataset.mode ?? '',
      datasetZoom: document.documentElement.dataset.zoom ?? '',
    };
    if (actual.flavor !== expected.flavor) {
      throw new Error('matrix state failed: flavor select expected ' + expected.flavor + ', got ' + actual.flavor);
    }
    if (actual.mode !== expected.mode) {
      throw new Error('matrix state failed: mode select expected ' + expected.mode + ', got ' + actual.mode);
    }
    if (actual.scale !== expected.scale) {
      throw new Error('matrix state failed: scale select expected ' + expected.scale + ', got ' + actual.scale);
    }
    if (actual.datasetFlavor !== expected.flavor) {
      throw new Error('matrix state failed: dataset flavor expected ' + expected.flavor + ', got ' + actual.datasetFlavor);
    }
    if (actual.datasetMode !== expected.mode) {
      throw new Error('matrix state failed: dataset mode expected ' + expected.mode + ', got ' + actual.datasetMode);
    }
    const expectedZoom = expected.scale === 'md' ? '' : expected.scale;
    if (actual.datasetZoom !== expectedZoom) {
      throw new Error('matrix state failed: dataset zoom expected ' + expectedZoom + ', got ' + actual.datasetZoom);
    }
    true;
    `,
  );
}

async function runThemeMatrix() {
  const matrixDir = path.join(reportDir, 'theme-matrix');
  await ensureDir(matrixDir);
  const server = await ensureDevServer();
  const cells = [];
  const expectedCells = 24;
  const assertionLabel = 'page-ready / state-applied / no-horizontal-overflow / sera-computed-contracts';
  try {
    setViewport(appSession);
    loginAsAdmin(appSession);
    agent(appSession, ['open', new URL('/dev/theme-states', baseOrigin).href]);
    agent(appSession, ['wait', '1000']);
    assertThemeMatrixReady(appSession);

    for (const flavor of ['feishu', 'claude', 'shadcn', 'sera']) {
      for (const mode of ['light', 'dark']) {
        for (const scale of ['sm', 'md', 'lg']) {
          setMatrixSelect(appSession, 'flavor', flavor);
          setMatrixSelect(appSession, 'mode', mode);
          setMatrixSelect(appSession, 'scale', scale);
          agent(appSession, ['wait', '350']);
          assertMatrixStateApplied(appSession, { flavor, mode, scale });
          assertNoHorizontalOverflow(appSession);
          if (flavor === 'sera') assertSeraComputedContracts(appSession);
          const file = path.join(matrixDir, `${flavor}-${mode}-${scale}.png`);
          agent(appSession, ['screenshot', file]);
          cells.push({
            flavor,
            mode,
            scale,
            file: path.relative(root, file),
            assertions: flavor === 'sera'
              ? ['state applied', 'no horizontal overflow', 'sera computed contracts']
              : ['state applied', 'no horizontal overflow'],
          });
        }
      }
    }
    return {
      cells,
      expectedCells,
      actualCells: cells.length,
      assertionLabel,
      noHorizontalOverflowPassed: cells.length === expectedCells,
      serverReused: server.reused,
    };
  } finally {
    await server.stop();
  }
}

async function writeReport(data) {
  await ensureDir(reportDir);
  const lines = [
    '# M0/M1 视觉验收报告',
    '',
    `生成时间：${new Date().toISOString()}`,
    `浏览器工具：Agent Browser CLI`,
    `Viewport：${viewport.width}x${viewport.height}`,
    '',
  ];

  if (data.baselines?.length) {
    lines.push('## 原型基线', '');
    for (const item of data.baselines) lines.push(`- ${item.key}: ${item.file}`);
    lines.push('');
  }
  if (data.app?.captures?.length) {
    lines.push('## 实现侧截图', '');
    for (const item of data.app.captures) lines.push(`- ${item.key}: ${item.file}`);
    lines.push('');
  }
  if (data.app?.diffs?.length) {
    lines.push('## 差异输出', '');
    for (const item of data.app.diffs) {
      lines.push(`- ${item.key}: ${item.ok ? '无可见差异' : '存在差异'}；diff: ${item.diff}`);
      if (item.output) lines.push(`  - ${item.output.replaceAll('\n', ' ')}`);
    }
    lines.push('');
  }
  if (data.scale?.results?.length) {
    lines.push('## 显示比例三档', '');
    for (const item of data.scale.results) {
      lines.push(`- ${item.zoom}: ${item.assertions.join(' / ')}；popover: ${item.popover}；sheet: ${item.sheet}；rolesDialog: ${item.rolesDialog}；menusDialog: ${item.menusDialog}`);
    }
    lines.push('');
  }
  if (data.matrix?.cells?.length) {
    lines.push('## 主题矩阵（flavor × mode × scale）', '');
    lines.push(`- 矩阵截图总数: ${data.matrix.actualCells ?? data.matrix.cells.length}/${data.matrix.expectedCells ?? data.matrix.cells.length}`);
    lines.push(`- 断言: ${data.matrix.assertionLabel ?? 'state-applied / no-horizontal-overflow'}`);
    lines.push(`- 水平溢出检查: ${data.matrix.noHorizontalOverflowPassed ? '全部通过' : '未全部通过'}`);
    for (const cell of data.matrix.cells) {
      lines.push(`- ${cell.flavor} / ${cell.mode} / ${cell.scale}: ${cell.file}`);
    }
    lines.push('');
  }

  await writeFile(path.join(reportDir, 'report.md'), `${lines.join('\n')}\n`);
  await writeFile(path.join(reportDir, 'report.json'), `${JSON.stringify(data, null, 2)}\n`);
}

async function main() {
  const command = process.argv[2] ?? 'all';
  agent('m0-probe', ['--version']);

  const data = {};
  if (command === 'baseline' || command === 'all') {
    data.baselines = await capturePrototypeBaselines();
  }
  if (command === 'app' || command === 'all') {
    data.app = await captureAppScreens();
  }
  if (command === 'scale' || command === 'all') {
    data.scale = await runScaleChecks();
  }
  if (command === 'matrix' || command === 'all') {
    data.matrix = await runThemeMatrix();
  }
  if (!['baseline', 'app', 'scale', 'matrix', 'all'].includes(command)) {
    throw new Error(`unknown command: ${command}`);
  }

  await writeReport(data);
  console.log(`M0 visual report: ${path.relative(root, path.join(reportDir, 'report.md'))}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
