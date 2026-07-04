// 确定性验收（spec §13.1）：jsdom 不解析 CSS 文件，直接读 tokens.css 文本断言字面值。
import { readFileSync } from 'node:fs';

const css = readFileSync('src/styles/tokens.css', 'utf8');
const globalCss = readFileSync('src/styles/global.css', 'utf8');
const buttonSource = readFileSync('src/components/ui/button.tsx', 'utf8');
const loginSource = readFileSync('src/routes/login.tsx', 'utf8');

// 权威值表：原型 L4796-4805 逐字对照，全表逐值断言（tokens.css 全部变量声明，无抽样遗漏）。
// 静态硬编码，非运行时从 tokens.css 提取——否则文件怎么改断言都跟着变，失去守护意义。
// 每条含结尾分号，避免数值前缀碰撞误判（如 "--radius-factor: 1" 会被 "--radius-factor: 1.55" 误判命中）。
const MUST_CONTAIN = [
  // :root, [data-flavor='feishu'][data-mode='light']
  '--pri: #3370ff;',
  '--pri-soft: #eef3ff;',
  '--bg: #f5f6f7;',
  '--canvas: #eceef1;',
  '--surface: #ffffff;',
  '--chrome: #ffffff;',
  '--surface-2: #f2f3f5;',
  '--surface-blur: rgba(255, 255, 255, 0.72);',
  '--text: #1f2329;',
  '--text-2: #4e5969;',
  '--text-3: #8f959e;',
  '--border: #e5e6eb;',
  // [data-flavor='feishu'][data-mode='dark']
  '--pri-soft: rgba(255, 255, 255, 0.08);',
  '--bg: #111318;',
  '--canvas: #0c0d10;',
  '--surface: #1b1d23;',
  '--chrome: #16181d;',
  '--surface-2: #262931;',
  '--surface-blur: rgba(27, 29, 35, 0.72);',
  '--text: #e7e9ec;',
  '--text-2: #a3aab3;',
  '--text-3: #7a818b;',
  '--border: #2c2f38;',
  // [data-flavor='claude'][data-mode='light']
  '--pri: #cc785c;',
  '--pri-soft: #f8ede7;',
  '--bg: #faf9f5;',
  '--canvas: #f8f8f6;',
  '--surface: #ffffff;',
  '--chrome: #faf9f5;',
  '--surface-2: #f5f0e8;',
  '--surface-blur: rgba(250, 249, 245, 0.78);',
  '--text: #141413;',
  '--text-2: #3d3d3a;',
  '--text-3: #6c6a64;',
  '--border: #e6dfd8;',
  // [data-flavor='claude'][data-mode='dark']
  '--pri-soft: rgba(255, 255, 255, 0.09);',
  '--bg: #1c1917;',
  '--canvas: #161311;',
  '--surface: #262220;',
  '--chrome: #211d1a;',
  '--surface-2: #302b27;',
  '--surface-blur: rgba(33, 29, 26, 0.78);',
  '--text: #ece6dd;',
  '--text-2: #a89f92;',
  '--text-3: #7d7568;',
  '--border: #3a342e;',
  // :root（语义色 / --pri-hover / 圆角公式）
  '--pri-hover: color-mix(in srgb, var(--pri) 85%, black);',
  '--success: #16a34a;',
  '--success-soft: #e8f7ee;',
  '--warning: #ff8000;',
  '--warning-soft: #fff3e8;',
  '--danger: #f53f3f;',
  '--danger-soft: #feecec;',
  '--control-border: color-mix(in srgb, var(--border) 70%, var(--text-3));',
  '--focus-ring: calc(3px * var(--app-scale));',
  '--radius-factor: 1;',
  '--control-btn-md: calc(32px * var(--app-scale));',
  '--button-font-weight: 400;',
  '--radius-sm: calc(6px * var(--radius-factor) * var(--app-scale));',
  '--radius-md: calc(8px * var(--radius-factor) * var(--app-scale));',
  '--radius-lg: calc(12px * var(--radius-factor) * var(--app-scale));',
  '--radius-xl: calc(14px * var(--radius-factor) * var(--app-scale));',
  // [data-radius='sharp'] / [data-radius='round']
  '--radius-factor: 0.28;',
  '--radius-factor: 1.55;',
];
test.each(MUST_CONTAIN)('token %s 与原型一致', (t) => expect(css).toContain(t));

test('显示比例三档走 --app-scale token 乘法，不再使用 CSS zoom 反向补偿', () => {
  expect(css).toContain(':root { --app-scale: 1; }');
  expect(css).toContain("[data-zoom='sm'] { --app-scale: 0.9; }");
  expect(css).toContain("[data-zoom='lg'] { --app-scale: 1.08; }");
  expect(css).not.toContain('--zoom-inverse');
  expect(globalCss).not.toMatch(/html\[data-zoom=.*\]\s+#root\s*\{\s*zoom:/);
  expect(globalCss).not.toContain('.h-app');
});

test('显示比例基础层覆盖 Tailwind spacing 与 text token', () => {
  expect(globalCss).toContain('--spacing: calc(0.25rem * var(--app-scale));');
  expect(globalCss).toContain('--text-xs: calc(0.75rem * var(--app-scale));');
  expect(globalCss).toContain('--text-sm: calc(0.875rem * var(--app-scale));');
  expect(globalCss).toContain('--text-base: calc(1rem * var(--app-scale));');
  expect(globalCss).toContain('--text-lg: calc(1.125rem * var(--app-scale));');
  expect(globalCss).toContain('--text-xl: calc(1.25rem * var(--app-scale));');
  expect(globalCss).toContain('--text-2xl: calc(1.5rem * var(--app-scale));');
  expect(globalCss).toContain('--text-3xl: calc(1.875rem * var(--app-scale));');
});

test('显示比例基础层覆盖 Dialog 等 shadcn container token', () => {
  expect(globalCss).toContain('--container-sm: calc(24rem * var(--app-scale));');
  expect(globalCss).toContain('--container-lg: calc(32rem * var(--app-scale));');
});

test('原生交互元素有设计体系 focus-visible 兜底', () => {
  expect(globalCss).toContain('button:focus-visible');
  expect(globalCss).toContain('a:focus-visible');
  expect(globalCss).toContain('box-shadow: 0 0 0 var(--focus-ring) var(--soft);');
});

test('shadcn semantic foreground 不再硬编码白色', () => {
  expect(css).toContain('--on-pri: #ffffff;');
  expect(css).toContain('--on-danger: #ffffff;');
  expect(css).toContain('--danger-hover: color-mix(in srgb, var(--danger) 90%, transparent);');
  expect(css).toContain("[data-mode='dark'] {\n  --pri-hover: color-mix(in srgb, var(--pri) 85%, white);");
  expect(globalCss).toContain('--color-primary-foreground: var(--on-pri);');
  expect(globalCss).toContain('--color-destructive-foreground: var(--on-danger);');
});

test('原生可点击元素有设计体系 pointer 光标兜底', () => {
  expect(globalCss).toContain("button:not(:disabled):not([aria-disabled='true'])");
  expect(globalCss).toContain('a[href]');
  expect(globalCss).toContain("[role='button']:not([aria-disabled='true'])");
  expect(globalCss).toContain("[role='tab']:not([aria-disabled='true'])");
  expect(globalCss).toContain('cursor: pointer;');
});

test('Field 族 token 与 flavor 覆盖按 Step 2 值表落地', () => {
  const fieldTokens = [
    '--field-bg: var(--surface-2);',
    '--field-fg: var(--text);',
    '--field-placeholder: var(--text-3);',
    '--field-icon: var(--text-3);',
    '--field-border: var(--surface-2);',
    '--field-shadow: none;',
    '--field-border-hover: var(--control-border);',
    '--field-bg-focus: var(--surface);',
    '--field-border-focus: var(--pri);',
    '--field-ring-focus: transparent;',
    '--field-border-invalid: var(--danger);',
    '--field-ring-invalid: var(--danger-bg);',
    '--field-bg-disabled: var(--surface-2);',
    '--field-bg-readonly: var(--surface-2);',
    '--field-addon-bg: var(--surface-2);',
    '--field-addon-fg: var(--text-3);',
  ];

  for (const token of fieldTokens) {
    expect(css).toContain(token);
  }
  expect(css).toContain("[data-flavor='claude'] {\n  --field-bg: var(--surface);");
  expect(css).toContain('--field-border-focus: var(--pri);');
  expect(css).toContain('--field-ring-focus: color-mix(in srgb, var(--pri) 15%, transparent);');
  expect(css).toContain("[data-flavor='shadcn'] {\n  --field-bg: transparent;");
  expect(css).toContain('--field-bg-focus: transparent;');
  expect(css).toContain('--field-border-focus: var(--control-border);');
  expect(css).toContain('--field-ring-focus: color-mix(in srgb, var(--text-3) 50%, transparent);');
});

test('ui-field 状态机消费中间态 token，并保持 disabled > invalid > focus/open > hover 优先级', () => {
  expect(globalCss).toContain('.ui-field {');
  expect(globalCss).toContain('--_field-bg: var(--field-bg);');
  expect(globalCss).toContain('--_field-border: var(--field-border);');
  expect(globalCss).toContain('--_field-ring-color: transparent;');
  expect(globalCss).toContain('background: var(--_field-bg);');
  expect(globalCss).toContain('border-color: var(--_field-border);');
  expect(globalCss).toContain('box-shadow: var(--field-shadow);');
  expect(globalCss).toContain('.ui-field.ui-field[data-placeholder] {');
  expect(globalCss).toContain('.ui-field.ui-field:hover {');
  expect(globalCss).toContain('--_field-border: var(--field-border-hover);');
  expect(globalCss).toContain('.ui-field.ui-field:focus-within,');
  expect(globalCss).toContain(".ui-field.ui-field[data-state='open'] {");
  expect(globalCss).toContain('--_field-bg: var(--field-bg-focus);');
  expect(globalCss).toContain('--_field-border: var(--field-border-focus);');
  expect(globalCss).toContain('--_field-ring-color: var(--field-ring-focus);');
  expect(globalCss).toContain('box-shadow: 0 0 0 var(--focus-ring) var(--_field-ring-color);');
  expect(globalCss).toContain(".ui-field.ui-field[aria-invalid='true'],");
  expect(globalCss).toContain(".ui-field.ui-field[data-status='error'] {");
  expect(globalCss).toContain('--_field-border: var(--field-border-invalid);');
  expect(globalCss).toContain('--_field-ring-color: var(--field-ring-invalid);');

  const invalidIndex = globalCss.indexOf(".ui-field.ui-field[aria-invalid='true']");
  const disabledIndex = globalCss.indexOf('.ui-field.ui-field:disabled');
  expect(disabledIndex).toBeGreaterThan(invalidIndex);
  expect(globalCss.slice(disabledIndex)).toContain('--_field-bg: var(--field-bg-disabled);');
  expect(globalCss.slice(disabledIndex)).toContain('--_field-border: var(--field-border);');
  expect(globalCss.slice(disabledIndex)).toContain('--_field-ring-color: transparent;');
});

test('shadcn flavor 提供官方中性基线 token', () => {
  expect(css).toContain("[data-flavor='shadcn'][data-mode='light']");
  expect(css).toContain('--bg: #ffffff; --canvas: #fafafa; --surface: #ffffff; --chrome: #ffffff;');
  expect(css).toContain('--surface-2: #f4f4f5; --surface-blur: rgba(255, 255, 255, 0.82);');
  expect(css).toContain('--text: #09090b; --text-2: #3f3f46; --text-3: #71717a; --border: #e4e4e7;');
  expect(css).toContain("[data-flavor='shadcn'][data-mode='dark']");
  expect(css).toContain('--bg: #09090b; --canvas: #09090b; --surface: #18181b; --chrome: #09090b;');
  expect(css).toContain('--surface-2: #27272a; --surface-blur: rgba(24, 24, 27, 0.78);');
  expect(css).toContain('--text: #fafafa; --text-2: #d4d4d8; --text-3: #a1a1aa; --border: #27272a;');
});

test('圆角因子三档 + 四条 calc 公式', () => {
  expect(css).toContain('--radius-factor: 1;'); // 默认档
  expect(css).toContain("html:not([data-radius])[data-flavor='feishu'] { --radius-factor: 0.75; }");
  expect(css).toContain("html:not([data-radius])[data-flavor='claude'] { --radius-factor: 1; }");
  expect(css).toContain("html:not([data-radius])[data-flavor='shadcn'] { --radius-factor: 1.25; }");
  expect(css).toContain('--radius-factor: 0.28;'); // sharp
  expect(css).toContain('--radius-factor: 1.55;'); // round
  expect(css).toContain('--radius-xs: calc(2px * var(--radius-factor) * var(--app-scale));');
  expect(css).toContain('--radius-sm: calc(6px * var(--radius-factor) * var(--app-scale));');
  expect(css).toContain('--radius-md: calc(8px * var(--radius-factor) * var(--app-scale));');
  expect(css).toContain('--radius-lg: calc(12px * var(--radius-factor) * var(--app-scale));');
  expect(css).toContain('--radius-xl: calc(14px * var(--radius-factor) * var(--app-scale));');
});

test('形态轴控制按钮高度与字重，按钮消费独立 button token', () => {
  expect(css).toContain("[data-flavor='claude'] {\n  --field-bg: var(--surface);");
  expect(css).toContain('--control-btn-md: calc(36px * var(--app-scale));');
  expect(css).toContain("[data-flavor='shadcn'] {\n  --field-bg: transparent;");
  expect(css).toContain('--control-md: calc(32px * var(--app-scale));');
  expect(css).toContain('--control-btn-md: calc(32px * var(--app-scale));');
  expect(css).toContain('--button-font-weight: 500;');
  expect(buttonSource).toContain('font-[var(--button-font-weight)]');
  expect(buttonSource).toContain('h-[var(--control-btn-md)]');
  expect(buttonSource).toContain('size-[var(--control-btn-md)]');
});

test('claude display font 只进入页面标题层，不污染 Field label / 表头', () => {
  expect(css).toContain('--font-display: var(--font-sans);');
  expect(css).toContain('--font-display: "Cormorant Garamond", Georgia, "Songti SC", serif;');
  expect(globalCss).toContain('.ui-page-title {');
  expect(globalCss).toContain('font-family: var(--font-display);');
  expect(loginSource).toContain('ui-page-title');
});

// 圆角数字全档（原型精确 7/9/11 档，取最近 sm/md/lg/xl 会失真）。每条含完整 calc 串防前缀碰撞。
test('圆角数字全档 10 档 calc 公式', () => {
  expect(css).toContain('--radius-4: calc(4px * var(--radius-factor) * var(--app-scale));');
  expect(css).toContain('--radius-5: calc(5px * var(--radius-factor) * var(--app-scale));');
  expect(css).toContain('--radius-6: calc(6px * var(--radius-factor) * var(--app-scale));');
  expect(css).toContain('--radius-7: calc(7px * var(--radius-factor) * var(--app-scale));');
  expect(css).toContain('--radius-8: calc(8px * var(--radius-factor) * var(--app-scale));');
  expect(css).toContain('--radius-9: calc(9px * var(--radius-factor) * var(--app-scale));');
  expect(css).toContain('--radius-10: calc(10px * var(--radius-factor) * var(--app-scale));');
  expect(css).toContain('--radius-11: calc(11px * var(--radius-factor) * var(--app-scale));');
  expect(css).toContain('--radius-12: calc(12px * var(--radius-factor) * var(--app-scale));');
  expect(css).toContain('--radius-14: calc(14px * var(--radius-factor) * var(--app-scale));');
});

// Tooltip 恒深底白字 token（原型 .hicon-tip L32 background #1f2329，明暗都不反转）。
test('tooltip 恒深底 token 与原型一致', () => {
  expect(css).toContain('--tooltip-bg: #1f2329;');
});

// 弹层/悬浮阴影 token（原型 box-shadow 精确值）：组件禁 shadow-[...] 任意值，统一走这些 token。
test('弹层阴影 token 与原型精确值一致', () => {
  expect(css).toContain('--shadow-popover: 0 12px 40px rgba(0, 0, 0, 0.16);');
  expect(css).toContain('--shadow-modal: 0 16px 48px rgba(0, 0, 0, 0.18);');
  expect(css).toContain('--shadow-drawer: -8px 0 32px rgba(0, 0, 0, 0.14);');
  expect(css).toContain('--shadow-tooltip: 0 4px 14px rgba(0, 0, 0, 0.18);');
  expect(css).toContain('--shadow-card: 0 1px 3px rgba(0, 0, 0, 0.03);');
  expect(css).toContain('--shadow-card-sm: 0 1px 2px rgba(0, 0, 0, 0.06);');
  expect(css).toContain('--shadow-inset-card: 0 1px 2px rgba(0, 0, 0, 0.06), 0 6px 20px rgba(0, 0, 0, 0.05);');
  expect(css).toContain('--shadow-lift: 0 1px 2px rgba(0, 0, 0, 0.08);');
  expect(css).toContain('--shadow-header: 0 1px 12px rgba(0, 0, 0, 0.06);');
});

// 锁 FOUC 脚本与 store 的契约不被静默删除：localStorage key 'appearance' + dataset.flavor/mode 写入，
// 以及 Task 14 的首帧防闪蓝——脚本必须读派生值注入 --pri（否则自选主题色首帧闪回蓝）。
test('index.html FOUC 脚本契约不被静默删除（含 --pri 注入）', () => {
  const html = readFileSync('index.html', 'utf8');
  expect(html).toContain('appearance');
  expect(html).toContain('dataset.flavor');
  expect(html).toContain('dataset.mode');
  expect(html).toContain('--pri');
  expect(html).toContain('--pri-active');
  expect(html).toContain('--on-pri');
  expect(html).toContain('_priResolved');
  expect(html).toContain('_priActiveResolved');
  expect(html).toContain('_onPriResolved');
});

test('Tailwind source 限定在 src，避免 docs 里的示例 class 污染生产 CSS', () => {
  expect(globalCss).toContain("@import 'tailwindcss' source('../');");
});
