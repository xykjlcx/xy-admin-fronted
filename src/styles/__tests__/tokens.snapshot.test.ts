// 确定性验收（spec §13.1）：jsdom 不解析 CSS 文件，直接读 tokens.css 文本断言字面值。
import { readFileSync } from 'node:fs';

// tokens.css 已拆分为 base + 三 flavor profile（S1）。拼接后断言不变——MUST_CONTAIN 逐值校验一律照旧。
const css = ['tokens.base.css', 'tokens.feishu.css', 'tokens.claude.css', 'tokens.shadcn.css']
  .map((f) => readFileSync(`src/styles/${f}`, 'utf8'))
  .join('\n');
const globalCss = readFileSync('src/styles/global.css', 'utf8');
const claudeDesignSource = readFileSync('docs/design/claude.design.md', 'utf8');
const appearanceDomSource = readFileSync('src/lib/appearance-dom.ts', 'utf8');
const appearanceConfigSource = readFileSync('src/config/appearance.ts', 'utf8');
const buttonSource = readFileSync('src/components/ui/button.tsx', 'utf8');
const dialogSource = readFileSync('src/components/ui/dialog.tsx', 'utf8');
const sheetSource = readFileSync('src/components/ui/sheet.tsx', 'utf8');
const popoverSource = readFileSync('src/components/ui/popover.tsx', 'utf8');
const dropdownMenuSource = readFileSync('src/components/ui/dropdown-menu.tsx', 'utf8');
const selectSource = readFileSync('src/components/ui/select.tsx', 'utf8');
const tooltipSource = readFileSync('src/components/ui/tooltip.tsx', 'utf8');
const tabsSource = readFileSync('src/components/ui/tabs.tsx', 'utf8');
const tableSource = readFileSync('src/components/ui/table.tsx', 'utf8');
const animatedTabsSource = readFileSync('src/components/pro/AnimatedTabs.tsx', 'utf8');
const dataTableSource = readFileSync('src/components/pro/DataTable.tsx', 'utf8');
const tableShellSource = readFileSync('src/components/pro/TableShell.tsx', 'utf8');
const pageScaffoldSource = readFileSync('src/components/pro/PageScaffold.tsx', 'utf8');
const sideListSource = readFileSync('src/components/pro/SideList.tsx', 'utf8');
const paginationSource = readFileSync('src/components/pro/Pagination.tsx', 'utf8');
const appearanceDrawerSource = readFileSync('src/app/shell/widgets/AppearanceDrawer.tsx', 'utf8');
const shellHeaderSource = readFileSync('src/app/shell/widgets/ShellHeader.tsx', 'utf8');
const navMenuSidebarSource = readFileSync('src/app/shell/widgets/NavMenuSidebar.tsx', 'utf8');
const navMenuRailSource = readFileSync('src/app/shell/widgets/NavMenuRail.tsx', 'utf8');
const navMenuInsetSource = readFileSync('src/app/shell/widgets/NavMenuInset.tsx', 'utf8');
const subsystemSwitcherSource = readFileSync('src/app/shell/widgets/SubsystemSwitcher.tsx', 'utf8');
const membersTableSource = readFileSync('src/modules/admin/users/list/MembersTable.tsx', 'utf8');
const usersModelSource = readFileSync('src/modules/admin/users/model.ts', 'utf8');
const roleListPanelSource = readFileSync('src/modules/admin/pages/roles/RoleListPanel.tsx', 'utf8');
const rolesModelSource = readFileSync('src/modules/admin/pages/roles/model.ts', 'utf8');
const roleDetailsPanelSource = readFileSync('src/modules/admin/pages/roles/RoleDetailsPanel.tsx', 'utf8');
const rolePermissionEditorSource = readFileSync('src/modules/admin/pages/roles/RolePermissionEditor.tsx', 'utf8');
const menuTreeTableSource = readFileSync('src/modules/admin/pages/menus/MenuTreeTable.tsx', 'utf8');
const menuFormDialogSource = readFileSync('src/modules/admin/pages/menus/MenuFormDialog.tsx', 'utf8');
const menusPageSource = readFileSync('src/modules/admin/pages/menus/index.tsx', 'utf8');
const checkboxSource = readFileSync('src/components/ui/checkbox.tsx', 'utf8');
const radioGroupSource = readFileSync('src/components/ui/radio-group.tsx', 'utf8');
const switchSource = readFileSync('src/components/ui/switch.tsx', 'utf8');
const skeletonSource = readFileSync('src/components/ui/skeleton.tsx', 'utf8');
const emptySource = readFileSync('src/components/ui/empty.tsx', 'utf8');
const loginSource = readFileSync('src/routes/login.tsx', 'utf8');
const languageMenuSource = readFileSync('src/app/shell/widgets/LanguageMenu.tsx', 'utf8');
const themeStatesSource = readFileSync('src/routes/_auth/dev/theme-states.tsx', 'utf8');

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
  '--border: #dee0e3;',
  '--control-border: #d0d3d6;',
  '--divider: rgba(31, 35, 41, 0.15);',
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
  '--pri: #d97757;',
  '--pri-soft: rgba(217, 119, 87, 0.12);',
  '--bg: #faf9f5;',
  '--canvas: #faf9f5;',
  '--surface: #ffffff;',
  '--chrome: #faf9f5;',
  '--surface-2: #f5f4ed;',
  '--surface-blur: rgba(250, 249, 245, 0.78);',
  '--text: #141413;',
  '--text-2: #3d3d3a;',
  '--text-3: #6c6a64;',
  '--border: rgba(31, 30, 29, 0.3);',
  // [data-flavor='claude'][data-mode='dark']
  '--pri-soft: rgba(255, 255, 255, 0.09);',
  '--bg: #141413;',
  '--canvas: #141413;',
  '--surface: #30302e;',
  '--chrome: #262624;',
  '--surface-2: #262624;',
  '--surface-blur: rgba(38, 38, 36, 0.78);',
  '--text: #faf9f5;',
  '--text-2: #dedcd1;',
  '--text-3: #b8b5a8;',
  '--border: rgba(222, 220, 209, 0.3);',
  // :root（语义色 / --pri-hover / 圆角公式）
  '--pri-hover: color-mix(in srgb, var(--pri) 85%, white);',
  '--success: #16a34a;',
  '--success-soft: #e8f7ee;',
  '--warning: #ff8000;',
  '--warning-soft: #fff3e8;',
  '--danger: #f53f3f;',
  '--danger-soft: #feecec;',
  '--fill-hover: rgba(31, 35, 41, 0.08);',
  '--fill-pressed: rgba(31, 35, 41, 0.12);',
  '--fill-selected: color-mix(in srgb, var(--pri) 10%, transparent);',
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
  '--field-px: calc(12px * var(--app-scale));',
  '--table-cell-px: var(--field-px);',
  '--table-row-h: calc(44px * var(--app-scale));',
  '--table-header-h: calc(48px * var(--app-scale));',
  // Badge 几何/排印挂点（S3，值=现状，零视觉变化）：radius/px/py/font-size/font-weight
  '--badge-radius: var(--radius-5);',
  '--badge-px: calc(8px * var(--app-scale));',
  '--badge-py: calc(2px * var(--app-scale));',
  '--badge-font-size: var(--text-xs);',
  '--badge-font-weight: 500;',
];
test.each(MUST_CONTAIN)('token %s 与原型一致', (t) => expect(css).toContain(t));

// field 水平内距分档（密度轴）：feishu/shadcn 紧凑 12px（:root 默认），claude 宽松 16px
test('field 水平内距分档：claude 覆盖为宽松档', () => {
  expect(css).toContain('--field-px: calc(12px * var(--app-scale));'); // :root 默认（feishu/shadcn）
  expect(css).toContain('--field-px: calc(16px * var(--app-scale));'); // claude 覆盖
});

// table 密度分档（几何轴）：cell 内距链 field-px；行高 feishu/shadcn 44、claude 48；表头 feishu/claude 48、shadcn 44
test('table 密度分档：claude 行高宽松、shadcn 表头收紧', () => {
  expect(css).toContain('--table-cell-px: var(--field-px);');           // cell 内距链 field-px 单一真相源
  expect(css).toContain('--table-row-h: calc(44px * var(--app-scale));');   // :root 数据行 44（feishu/shadcn）
  expect(css).toContain('--table-header-h: calc(48px * var(--app-scale));'); // :root 表头 48（feishu/claude）
  expect(css).toContain('--table-row-h: calc(48px * var(--app-scale));');    // claude 覆盖：数据行 48
  expect(css).toContain('--table-header-h: calc(44px * var(--app-scale));'); // shadcn 覆盖：表头 44
});

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

test('语义前景、alpha 交互底与主色派生按 v4.1 值表落地', () => {
  expect(css).toContain('--on-pri: #ffffff;');
  expect(css).toContain('--on-danger: #ffffff;');
  expect(css).toContain('--danger-hover: color-mix(in srgb, var(--danger) 90%, transparent);');
  expect(css).toContain('--fill-hover: rgba(31, 35, 41, 0.08);');
  expect(css).toContain('--fill-pressed: rgba(31, 35, 41, 0.12);');
  expect(css).toContain('--fill-selected: color-mix(in srgb, var(--pri) 10%, transparent);');
  expect(css).toContain("[data-mode='dark'] {");
  expect(css).toContain('--fill-hover: rgba(255, 255, 255, 0.08);');
  expect(css).toContain('--fill-pressed: rgba(255, 255, 255, 0.12);');
  expect(globalCss).toContain('--color-primary-foreground: var(--on-pri);');
  expect(globalCss).toContain('--color-destructive-foreground: var(--on-danger);');
});

test('Claude 设计身份文档、token fallback 与 accent runtime 主色保持一致', () => {
  expect(claudeDesignSource).toContain('primary: "#D97757"');
  expect(claudeDesignSource).toContain('primary-active: "#C6613F"');
  expect(claudeDesignSource).toContain('primary-soft: "rgba(217, 119, 87, 0.12)"');
  expect(claudeDesignSource).toContain('on-primary: "#FFFFFF"');
  expect(claudeDesignSource).not.toContain('Step 9 精修候选');
  expect(css).toContain("[data-flavor='claude'][data-mode='light'] {\n  --pri: #d97757; --pri-soft: rgba(217, 119, 87, 0.12);");
  expect(css).toContain('--pri-active: #c6613f;');
  expect(appearanceDomSource).toContain("{ key: 'claude', labelKey: 'accentClaude', pri: '#d97757', active: '#c6613f', soft: 'rgba(217,119,87,.12)', onPri: '#ffffff' }");
  expect(appearanceConfigSource).toContain("customAccent: '#d97757'");
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
  expect(css).toContain("[data-flavor='claude'] {");
  expect(css).toContain('--field-bg: var(--surface);');
  expect(css).toContain('--field-border-focus: var(--pri);');
  expect(css).toContain('--field-ring-focus: color-mix(in srgb, var(--pri) 15%, transparent);');
  expect(css).toContain("[data-flavor='shadcn'] {");
  expect(css).toContain('--field-bg: transparent;');
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
  const invalidBlockStart = globalCss.indexOf(".ui-field.ui-field[aria-invalid='true'],");
  const invalidBlockEnd = globalCss.indexOf('}', invalidBlockStart);
  const invalidBlock = globalCss.slice(invalidBlockStart, invalidBlockEnd);
  expect(invalidBlock).not.toContain('--_field-ring-color: var(--field-ring-invalid);');
  expect(invalidBlock).not.toContain('box-shadow: 0 0 0 var(--focus-ring)');
  expect(globalCss).toContain(".ui-field.ui-field[aria-invalid='true']:focus-within,");
  expect(globalCss).toContain(".ui-field.ui-field[aria-invalid='true'][data-state='open'],");
  expect(globalCss).toContain(".ui-field.ui-field[data-status='error']:focus-within,");
  expect(globalCss).toContain(".ui-field.ui-field[data-status='error'][data-state='open'] {");
  expect(globalCss).toContain('--_field-ring-color: var(--field-ring-invalid);');

  const invalidIndex = globalCss.indexOf(".ui-field.ui-field[aria-invalid='true']");
  const invalidFocusIndex = globalCss.indexOf(".ui-field.ui-field[aria-invalid='true']:focus-within");
  const disabledIndex = globalCss.indexOf('.ui-field.ui-field:disabled');
  expect(disabledIndex).toBeGreaterThan(invalidIndex);
  expect(disabledIndex).toBeGreaterThan(invalidFocusIndex);
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
  expect(css).toContain('--text: #fafafa; --text-2: #d4d4d8; --text-3: #a1a1aa; --border: oklch(1 0 0 / 10%);');
  expect(css).toContain("--field-bg: oklch(1 0 0 / 4.5%);");
  expect(css).toContain('--field-ring-invalid: color-mix(in srgb, var(--danger) 20%, transparent);');
  expect(css).toContain('--field-ring-invalid: color-mix(in srgb, var(--danger) 40%, transparent);');
  expect(css).toContain('--pri-hover: color-mix(in srgb, var(--pri) 90%, transparent);');
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
  expect(css).toContain("[data-flavor='claude'] {");
  expect(css).toContain('--field-bg: var(--surface);');
  expect(css).toContain('--control-btn-md: calc(36px * var(--app-scale));');
  expect(css).toContain("[data-flavor='shadcn'] {");
  expect(css).toContain('--field-bg: transparent;');
  const shadcnBlock = css.slice(css.indexOf("[data-flavor='shadcn'] {"), css.indexOf("[data-flavor='shadcn'][data-mode='dark']"));
  expect(shadcnBlock).not.toContain('--control-md: calc(32px * var(--app-scale));');
  expect(shadcnBlock).not.toContain('--control-btn-md: calc(32px * var(--app-scale));');
  expect(css).toContain('--button-font-weight: 500;');
  expect(buttonSource).toContain('font-[var(--button-font-weight)]');
  expect(buttonSource).toContain('h-[var(--control-btn-md)]');
  expect(buttonSource).toContain('size-[var(--control-btn-md)]');
});

test('Button 族 token 与 Step 3 合同落地', () => {
  const buttonTokens = [
    '--button-primary-bg: var(--pri);',
    '--button-primary-bg-hover: var(--pri-hover);',
    '--button-primary-bg-active: var(--pri-active);',
    '--button-primary-fg: var(--on-pri);',
    '--button-secondary-bg: var(--surface);',
    '--button-secondary-bg-hover: var(--surface);',
    '--button-secondary-bg-active: var(--fill-pressed);',
    '--button-secondary-fg: var(--text);',
    '--button-secondary-fg-hover: var(--pri);',
    '--button-secondary-border: var(--border);',
    '--button-secondary-border-hover: var(--pri);',
    '--button-secondary-shadow: var(--shadow-card-sm);',
    '--button-dashed-fg: var(--text-2);',
    '--button-dashed-fg-hover: var(--pri);',
    '--button-dashed-border: var(--line-strong);',
    '--button-dashed-border-hover: var(--pri);',
    '--button-text-fg: var(--pri);',
    '--button-text-bg-hover: var(--fill-selected);',
    '--button-link-fg: var(--pri);',
    '--button-ghost-fg: var(--text-2);',
    '--button-ghost-fg-hover: var(--text);',
    '--button-ghost-bg-hover: var(--fill-hover);',
    '--button-danger-bg: var(--danger);',
    '--button-danger-bg-hover: var(--danger-hover);',
    '--button-danger-fg: var(--on-danger);',
    '--button-danger-ring: var(--danger-bg);',
    '--button-danger-ghost-fg: var(--danger);',
    '--button-danger-ghost-bg: var(--danger-bg);',
    '--button-danger-ghost-border: var(--danger);',
    '--button-icon-fg: var(--text-3);',
    '--button-icon-fg-hover: var(--text);',
    '--button-icon-bg-hover: var(--fill-hover);',
    '--button-ring: var(--soft);',
  ];

  for (const token of buttonTokens) {
    expect(css).toContain(token);
  }

  const requiredClasses = [
    'focus-visible:ring-(--button-ring)',
    'bg-(--button-primary-bg)',
    'text-(--button-primary-fg)',
    'hover:bg-(--button-primary-bg-hover)',
    'active:bg-(--button-primary-bg-active)',
    'border-(--button-secondary-border)',
    'bg-(--button-secondary-bg)',
    'text-(--button-secondary-fg)',
    'shadow-(--button-secondary-shadow)',
    'hover:border-(--button-secondary-border-hover)',
    'hover:text-(--button-secondary-fg-hover)',
    'border-(--button-dashed-border)',
    'text-(--button-dashed-fg)',
    'text-(--button-text-fg)',
    'hover:bg-(--button-text-bg-hover)',
    'text-(--button-link-fg)',
    'text-(--button-ghost-fg)',
    'hover:bg-(--button-ghost-bg-hover)',
    'bg-(--button-danger-bg)',
    'text-(--button-danger-fg)',
    'focus-visible:ring-(--button-danger-ring)',
    'bg-(--button-danger-ghost-bg)',
    'border-(--button-danger-ghost-border)',
  ];

  for (const className of requiredClasses) {
    expect(buttonSource).toContain(className);
  }
  expect(buttonSource).not.toContain('data-[icon-button=true]');
  expect(buttonSource).not.toContain('data-icon-button');

  for (const primitiveClass of [
    'bg-pri',
    'text-on-pri',
    'hover:bg-pri-hover',
    'active:bg-pri-active',
    'border-pri',
    'text-pri',
    'bg-pri-soft',
    'ring-soft',
    'bg-danger',
    'text-white',
    'ring-danger-bg',
  ]) {
    expect(buttonSource).not.toContain(primitiveClass);
  }
});

test('Overlay 族 token 与 Step 4 合同落地', () => {
  const overlayTokens = [
    '--overlay-mask-bg: rgba(0, 0, 0, 0.22);',
    '--overlay-mask-blur: 6px;',
    '--overlay-bg: var(--surface);',
    '--overlay-fg: var(--text);',
    '--overlay-border: var(--border);',
    '--overlay-shadow-modal: var(--shadow-modal);',
    '--overlay-shadow-popover: var(--shadow-popover);',
    '--overlay-close-fg: var(--button-icon-fg);',
    '--overlay-close-fg-hover: var(--button-icon-fg-hover);',
    '--overlay-close-bg-hover: var(--button-icon-bg-hover);',
  ];

  for (const token of overlayTokens) {
    expect(css).toContain(token);
  }

  expect(dialogSource).toContain('bg-(--overlay-mask-bg)');
  expect(dialogSource).toContain('backdrop-blur-[var(--overlay-mask-blur)]');
  expect(dialogSource).toContain('border-(--overlay-border)');
  expect(dialogSource).toContain('bg-(--overlay-bg)');
  expect(dialogSource).toContain('text-(--overlay-fg)');
  expect(dialogSource).toContain('shadow-(--overlay-shadow-modal)');
  expect(dialogSource).toContain('text-(--overlay-close-fg)');
  expect(dialogSource).toContain('hover:bg-(--overlay-close-bg-hover)');

  expect(sheetSource).toContain('bg-(--overlay-mask-bg)');
  expect(sheetSource).toContain('backdrop-blur-[var(--overlay-mask-blur)]');
  expect(sheetSource).toContain('border-(--overlay-border)');
  expect(sheetSource).toContain('bg-(--overlay-bg)');
  expect(sheetSource).toContain('text-(--overlay-fg)');
  expect(sheetSource).toContain('shadow-(--shadow-drawer)');
  expect(sheetSource).not.toContain('shadow-(--overlay-shadow-modal)');
  expect(sheetSource).toContain('text-(--overlay-close-fg)');

  for (const source of [popoverSource, dropdownMenuSource, selectSource]) {
    expect(source).toContain('border-(--overlay-border)');
    expect(source).toContain('bg-(--overlay-bg)');
    expect(source).toContain('text-(--overlay-fg)');
    expect(source).toContain('shadow-(--overlay-shadow-popover)');
  }
  expect(dropdownMenuSource).toContain('max-h-(--radix-dropdown-menu-content-available-height)');
  expect(selectSource).toContain('w-[var(--radix-select-trigger-width)]');
  expect(tooltipSource).toContain('bg-tooltip');
  expect(tooltipSource).not.toContain('bg-(--overlay-bg)');
});

test('Option / Menu 族 token 与 Step 5 合同落地', () => {
  const optionMenuTokens = [
    '--option-fg: var(--text);',
    '--option-fg-muted: var(--text-3);',
    '--option-bg-highlighted: var(--fill-hover);',
    '--option-fg-highlighted: var(--pri);',
    '--option-bg-selected: var(--fill-selected);',
    '--option-fg-selected: var(--pri);',
    '--option-check: var(--pri);',
    '--menu-item-fg: var(--text);',
    '--menu-item-bg-highlighted: var(--fill-hover);',
    '--menu-item-fg-highlighted: var(--text);',
    '--menu-item-fg-danger: var(--danger);',
    '--menu-item-bg-danger-highlighted: var(--danger-bg);',
  ];

  for (const token of optionMenuTokens) {
    expect(css).toContain(token);
  }

  expect(css).toContain("--option-fg-highlighted: var(--pri-active);");
  expect(css).toContain("--option-fg-selected: var(--pri-active);");
  expect(css).toContain("--option-bg-highlighted: var(--fill-hover);");
  expect(css).toContain("--option-bg-selected: var(--fill-selected);");

  expect(selectSource).toContain('text-(--option-fg)');
  expect(selectSource).toContain('focus:bg-(--option-bg-highlighted)');
  expect(selectSource).toContain('focus:text-(--option-fg-highlighted)');
  expect(selectSource).toContain('data-[highlighted]:bg-(--option-bg-highlighted)');
  expect(selectSource).toContain('data-[highlighted]:text-(--option-fg-highlighted)');
  expect(selectSource).toContain('data-[state=checked]:bg-(--option-bg-selected)');
  expect(selectSource).toContain('data-[state=checked]:text-(--option-fg-selected)');
  expect(selectSource).toContain('text-(--option-check)');
  expect(selectSource).not.toContain('focus:bg-pri-soft');

  expect(dropdownMenuSource).toContain('text-(--menu-item-fg)');
  expect(dropdownMenuSource).toContain('focus:bg-(--menu-item-bg-highlighted)');
  expect(dropdownMenuSource).toContain('focus:text-(--menu-item-fg-highlighted)');
  expect(dropdownMenuSource).toContain('data-[highlighted]:bg-(--menu-item-bg-highlighted)');
  expect(dropdownMenuSource).toContain('data-[highlighted]:text-(--menu-item-fg-highlighted)');
  expect(dropdownMenuSource).toContain('data-[variant=destructive]:text-(--menu-item-fg-danger)');
  expect(dropdownMenuSource).toContain('data-[variant=destructive]:focus:bg-(--menu-item-bg-danger-highlighted)');
  expect(dropdownMenuSource).toContain('data-[variant=destructive]:data-[highlighted]:bg-(--menu-item-bg-danger-highlighted)');
  expect(dropdownMenuSource).not.toContain('focus:bg-accent');
  expect(dropdownMenuSource).not.toContain('focus:text-accent-foreground');
  expect(dropdownMenuSource).not.toContain('data-[state=open]:bg-accent');

  expect(languageMenuSource).toContain('bg-(--option-bg-selected)');
  expect(languageMenuSource).toContain('text-(--option-fg-selected)');
  expect(languageMenuSource).toContain('text-(--option-check)');
  expect(languageMenuSource).not.toContain('bg-pri-soft focus:bg-pri-soft');
});

test('主题状态页暴露 Badge 可截图矩阵（S3 挂点验收载体，防误删）', () => {
  expect(themeStatesSource).toContain('badgeVariantsForThemeStates');
  expect(themeStatesSource).toContain("import { Badge } from '@/components/ui/badge'");
});

test('主题状态页暴露 Overlay / Option / Menu 可截图矩阵', () => {
  expect(themeStatesSource).toContain('step8OverlayOptionMatrix');
  expect(themeStatesSource).toContain('data-slot="popover-content"');
  expect(themeStatesSource).toContain('data-slot="select-content"');
  expect(themeStatesSource).toContain('data-slot="select-item"');
  expect(themeStatesSource).toContain('data-slot="dropdown-menu-content"');
  expect(themeStatesSource).toContain('data-slot="dropdown-menu-item"');
  expect(themeStatesSource).toContain('bg-(--option-bg-highlighted)');
  expect(themeStatesSource).toContain('bg-(--menu-item-bg-highlighted)');
  expect(themeStatesSource).not.toContain('<Select open');
  expect(themeStatesSource).not.toContain('<Popover open');
  expect(themeStatesSource).not.toContain('<DropdownMenu open');
});

test('Tabs / Choice / Skeleton / Empty 族 token 与 Step 6 合同落地', () => {
  const step6Tokens = [
    '--tabs-seg-list-bg: var(--surface-2);',
    '--tabs-seg-trigger-fg: var(--text-3);',
    '--tabs-seg-trigger-fg-hover: var(--text);',
    '--tabs-seg-trigger-bg-active: var(--surface);',
    '--tabs-seg-trigger-fg-active: var(--text);',
    '--tabs-seg-trigger-shadow-active: var(--shadow-card-sm);',
    '--tabs-line-border: var(--border);',
    '--tabs-line-trigger-fg: var(--text-2);',
    '--tabs-line-trigger-fg-hover: var(--text);',
    '--tabs-line-trigger-fg-active: var(--pri);',
    '--tabs-line-indicator: var(--pri);',
    '--tabs-ring: var(--soft);',
    '--choice-bg: var(--surface);',
    '--choice-border: var(--control-border);',
    '--choice-border-hover: var(--pri);',
    '--choice-bg-checked: var(--pri);',
    '--choice-border-checked: var(--pri);',
    '--choice-fg-checked: var(--on-pri);',
    '--choice-bg-indeterminate: var(--fill-selected);',
    '--choice-border-indeterminate: var(--pri);',
    '--choice-fg-indeterminate: var(--pri);',
    '--choice-bg-disabled: var(--surface-2);',
    '--choice-ring: var(--soft);',
    '--switch-bg: var(--control-border);',
    '--switch-bg-checked: var(--pri);',
    '--switch-thumb-bg: var(--surface);',
    '--skeleton-bg: var(--surface-2);',
    '--empty-fg: var(--text-3);',
  ];

  for (const token of step6Tokens) {
    expect(css).toContain(token);
  }

  expect(tabsSource).toContain('bg-(--tabs-seg-list-bg)');
  expect(tabsSource).toContain('text-(--tabs-seg-trigger-fg)');
  expect(tabsSource).toContain('hover:text-(--tabs-seg-trigger-fg-hover)');
  expect(tabsSource).toContain('data-[state=active]:bg-(--tabs-seg-trigger-bg-active)');
  expect(tabsSource).toContain('data-[state=active]:text-(--tabs-seg-trigger-fg-active)');
  expect(tabsSource).toContain('data-[state=active]:shadow-(--tabs-seg-trigger-shadow-active)');
  expect(tabsSource).toContain('border-(--tabs-line-border)');
  expect(tabsSource).toContain('ui-tabs-line-trigger');
  expect(tabsSource).not.toContain('group-data-[variant=line]/tabs-list:text-(--tabs-line-trigger-fg)');
  expect(tabsSource).not.toContain('group-data-[variant=line]/tabs-list:hover:text-(--tabs-line-trigger-fg-hover)');
  expect(tabsSource).not.toContain('group-data-[variant=line]/tabs-list:data-[state=active]:text-(--tabs-line-trigger-fg-active)');
  expect(tabsSource).toContain('after:bg-(--tabs-line-indicator)');
  expect(tabsSource).toContain('focus-visible:ring-(--tabs-ring)');

  expect(animatedTabsSource).toContain('border-(--tabs-line-border)');
  expect(animatedTabsSource).toContain('focus-visible:ring-(--tabs-ring)');
  expect(animatedTabsSource).not.toContain('border-(--tabs-line-indicator)');
  expect(animatedTabsSource).toContain('ui-tabs-line-trigger');
  expect(animatedTabsSource).not.toContain('text-(--tabs-line-trigger-fg-active)');
  expect(animatedTabsSource).not.toContain('text-(--tabs-line-trigger-fg)');
  expect(animatedTabsSource).not.toContain('hover:text-(--tabs-line-trigger-fg-hover)');
  expect(animatedTabsSource).toContain('bg-(--tabs-line-indicator)');

  expect(globalCss).toContain('.ui-tabs-line-trigger');
  expect(globalCss).toContain('--_tabs-line-trigger-fg: var(--tabs-line-trigger-fg);');
  expect(globalCss).toContain('--_tabs-line-trigger-fg: var(--tabs-line-trigger-fg-hover);');
  expect(globalCss).toContain("--_tabs-line-trigger-fg: var(--tabs-line-trigger-fg-active);");

  for (const source of [tabsSource, animatedTabsSource]) {
    for (const primitiveClass of ['text-pri', 'border-pri', 'bg-pri', 'ring-soft', 'bg-surface-2', 'shadow-card-sm']) {
      expect(source).not.toContain(primitiveClass);
    }
  }

  expect(checkboxSource).toContain('ui-choice');
  expect(checkboxSource).not.toContain('border-(--choice-border)');
  expect(checkboxSource).not.toContain('bg-(--choice-bg)');
  expect(checkboxSource).not.toContain('hover:border-(--choice-border-hover)');
  expect(checkboxSource).not.toContain('focus-visible:ring-(--choice-ring)');
  expect(checkboxSource).not.toContain('checked:border-(--choice-border-checked)');
  expect(checkboxSource).not.toContain('checked:bg-(--choice-bg-checked)');
  expect(checkboxSource).not.toContain('disabled:bg-(--choice-bg-disabled)');
  expect(checkboxSource).not.toContain('border-(--choice-border-indeterminate)');
  expect(checkboxSource).not.toContain('bg-(--choice-bg-indeterminate)');
  expect(checkboxSource).toContain('text-(--choice-fg-checked)');
  expect(checkboxSource).toContain('text-(--choice-fg-indeterminate)');

  expect(radioGroupSource).toContain('ui-choice');
  expect(radioGroupSource).not.toContain('border-(--choice-border)');
  expect(radioGroupSource).not.toContain('bg-(--choice-bg)');
  expect(radioGroupSource).not.toContain('focus-visible:border-(--choice-border-hover)');
  expect(radioGroupSource).not.toContain('focus-visible:ring-(--choice-ring)');
  expect(radioGroupSource).not.toContain('data-[state=checked]:border-(--choice-border-checked)');
  expect(radioGroupSource).not.toContain('aria-invalid:border-(--field-border-invalid)');
  expect(radioGroupSource).not.toContain('data-[state=checked]:aria-invalid:border-(--field-border-invalid)');
  expect(radioGroupSource).not.toContain('aria-invalid:ring-(--field-ring-invalid)');
  expect(radioGroupSource).not.toContain('shadow-card-sm');
  expect(radioGroupSource).toContain('fill-(--choice-bg-checked)');

  expect(globalCss).toContain('.ui-choice');
  expect(globalCss).toContain('--_choice-bg: var(--choice-bg);');
  expect(globalCss).toContain('--_choice-border: var(--choice-border);');
  expect(globalCss).toContain('--_choice-ring-color: transparent;');
  expect(globalCss).toContain('--_choice-border: var(--choice-border-hover);');
  expect(globalCss).toContain('--_choice-border: var(--choice-border-checked);');
  expect(globalCss).toContain('--_choice-bg: var(--choice-bg-disabled);');
  expect(globalCss).toContain('--_choice-ring-color: var(--field-ring-invalid);');

  expect(switchSource).toContain('focus-visible:border-(--choice-border-hover)');
  expect(switchSource).toContain('focus-visible:ring-(--choice-ring)');
  expect(switchSource).toContain('data-[state=checked]:bg-(--switch-bg-checked)');
  expect(switchSource).toContain('data-[state=unchecked]:bg-(--switch-bg)');
  expect(switchSource).toContain('bg-(--switch-thumb-bg)');

  for (const source of [checkboxSource, radioGroupSource, switchSource]) {
    for (const primitiveClass of [
      'border-pri',
      'bg-pri',
      'bg-pri-soft',
      'text-pri',
      'text-on-pri',
      'fill-pri',
      'ring-soft',
      'border-control-border',
      'bg-control-border',
    ]) {
      expect(source).not.toContain(primitiveClass);
    }
  }

  expect(skeletonSource).toContain('bg-(--skeleton-bg)');
  expect(skeletonSource).not.toContain('bg-surface-2');
  expect(emptySource).toContain('text-(--empty-fg)');
  expect(emptySource).not.toContain('text-text-3');
});

test('Table / Pro / Shell 族 token 与 Step 7 合同落地', () => {
  const step7Tokens = [
    '--table-bg: var(--surface);',
    '--table-border: var(--border);',
    '--table-header-bg: var(--surface-2);',
    '--table-header-fg: var(--text-3);',
    '--table-row-bg: var(--surface);',
    '--table-row-bg-hover: var(--fill-hover);',
    '--table-row-bg-selected: var(--fill-selected);',
    '--table-row-bg-expanded: var(--fill-hover);',
    '--table-row-fg: var(--text);',
    '--table-action-fg: var(--pri);',
    '--accent-emphasis: var(--pri);',
    '--accent-emphasis-soft: var(--fill-selected);',
    '--pro-page-bg: var(--bg);',
    '--pro-panel-bg: var(--surface);',
    '--pro-panel-border: var(--border);',
    '--pro-toolbar-bg: var(--surface);',
    '--pro-filter-bg: var(--surface);',
    '--side-list-bg: var(--surface);',
    '--side-list-border: var(--border);',
    '--side-list-item-bg-hover: var(--fill-hover);',
    '--side-list-item-bg-active: var(--fill-selected);',
    '--side-list-item-fg-active: var(--pri);',
    '--side-list-item-meta-fg-active: var(--pri);',
    '--shell-header-bg: var(--chrome);',
    '--nav-item-bg-hover: var(--fill-hover);',
    '--nav-item-bg-current: var(--fill-selected);',
    '--nav-item-fg-current: var(--pri);',
    '--pagination-current-bg: var(--fill-selected);',
    '--pagination-current-fg: var(--pri);',
    '--pagination-current-border: var(--pri);',
  ];

  for (const token of step7Tokens) {
    expect(css).toContain(token);
  }

  expect(tableSource).toContain('bg-(--table-bg)');
  expect(tableSource).toContain('text-(--table-row-fg)');
  expect(tableSource).toContain('[&_tr]:bg-(--table-header-bg)');
  expect(tableSource).toContain('text-(--table-header-fg)');
  expect(tableSource).toContain('ui-table-row');
  expect(tableSource).not.toContain('hover:bg-(--table-row-bg-hover)');
  expect(tableSource).not.toContain('aria-expanded:bg-(--table-row-bg-expanded)');
  expect(tableSource).not.toContain('data-[state=selected]:bg-(--table-row-bg-selected)');
  expect(tableSource).not.toContain('has-aria-expanded:bg-(--table-row-bg-expanded)');

  expect(tableShellSource).toContain('border-(--table-border)');
  expect(tableShellSource).toContain('bg-(--table-bg)');
  expect(tableShellSource).toContain('bg-(--table-header-bg)');
  expect(tableShellSource).toContain('text-(--table-header-fg)');
  expect(tableShellSource).toContain('ui-table-row');
  expect(tableShellSource).not.toContain('hover:bg-(--table-row-bg-hover)');
  expect(tableShellSource).not.toContain('aria-expanded:bg-(--table-row-bg-expanded)');
  expect(tableShellSource).not.toContain('has-aria-expanded:bg-(--table-row-bg-expanded)');
  expect(tableShellSource).not.toContain('data-[state=selected]:bg-(--table-row-bg-selected)');

  expect(globalCss).toContain('.ui-table-row');
  expect(globalCss).toContain('--_table-row-bg: var(--table-row-bg);');
  expect(globalCss).toContain('--_table-row-bg: var(--table-row-bg-hover);');
  expect(globalCss).toContain('--_table-row-bg: var(--table-row-bg-expanded);');
  expect(globalCss).toContain('--_table-row-bg: var(--table-row-bg-selected);');

  expect(pageScaffoldSource).toContain('bg-(--pro-page-bg)');
  expect(pageScaffoldSource).toContain('border-(--pro-panel-border)');
  expect(pageScaffoldSource).toContain('bg-(--pro-panel-bg)');
  expect(sideListSource).toContain('bg-(--side-list-bg)');
  expect(sideListSource).toContain('border-(--side-list-border)');
  expect(sideListSource).toContain('hover:bg-(--side-list-item-bg-hover)');
  expect(sideListSource).toContain('bg-(--side-list-item-bg-active)');
  expect(sideListSource).toContain('text-(--side-list-item-fg-active)');
  expect(sideListSource).toContain('text-(--side-list-item-meta-fg-active)');
  expect(paginationSource).toContain('border-(--pagination-current-border)');
  expect(paginationSource).toContain('bg-(--pagination-current-bg)');
  expect(paginationSource).toContain('text-(--pagination-current-fg)');
  expect(paginationSource).not.toContain('--nav-item');
  expect(shellHeaderSource).toContain('bg-(--shell-header-bg)');

  for (const source of [navMenuSidebarSource, navMenuRailSource, navMenuInsetSource, subsystemSwitcherSource]) {
    expect(source).toContain('bg-(--nav-item-bg-current)');
    expect(source).toContain('text-(--nav-item-fg-current)');
  }
  expect(appearanceDrawerSource).toContain('bg-(--nav-item-bg-current)');
  expect(appearanceDrawerSource).toContain('text-(--nav-item-fg-current)');

  expect(dataTableSource).toContain("const state = selectionEnabled && row.getIsSelected() ? 'selected' : rowState?.(row.original);");
  expect(dataTableSource).toContain('data-state={state}');
  expect(membersTableSource).toContain('bg-(--table-row-bg-selected)');
  expect(roleListPanelSource).toContain('bg-(--side-list-item-bg-active)');
  expect(rolePermissionEditorSource).toContain('bg-(--table-header-bg)');
  expect(usersModelSource).toContain('--accent-emphasis');
  expect(usersModelSource).not.toContain('--nav-item');
  expect(rolesModelSource).toContain('--accent-emphasis');
  expect(rolesModelSource).toContain("add: 'bg-(--accent-emphasis-soft) text-(--accent-emphasis)'");
  expect(rolesModelSource).toContain("create: 'bg-(--accent-emphasis-soft) text-(--accent-emphasis)'");
  expect(rolesModelSource).not.toContain('--nav-item');
  expect(rolesModelSource).not.toContain('bg-info-soft text-info');
  expect(menuTreeTableSource).toContain('bg-(--accent-emphasis-soft) text-(--accent-emphasis)');
  expect(menuTreeTableSource).toContain('bg-(--accent-emphasis-soft) text-(--accent-emphasis)');
  expect(menuTreeTableSource).not.toContain('bg-(--nav-item-bg-current) text-(--nav-item-fg-current)');
  expect(subsystemSwitcherSource).toContain("var(--accent-emphasis)' :");
  expect(roleDetailsPanelSource).toContain('text-(--accent-emphasis)');
  expect(rolePermissionEditorSource).toContain('text-(--accent-emphasis)');
  expect(rolePermissionEditorSource).toContain('bg-(--accent-emphasis-soft)');
  expect(rolePermissionEditorSource).toContain('transition-[grid-template-rows,opacity]');
  expect(rolePermissionEditorSource).toContain('grid-rows-[0fr] opacity-0');
  expect(rolePermissionEditorSource).toContain('grid-rows-[1fr] opacity-100');
  expect(rolePermissionEditorSource).not.toContain('--nav-item');
  expect(rolePermissionEditorSource).not.toContain('--table-action-fg');
  expect(menuTreeTableSource).toContain('data-menu-tree-row');
  expect(menuTreeTableSource).toContain('transition-[grid-template-rows,opacity]');
  expect(menuTreeTableSource).toContain('grid-rows-[0fr] opacity-0');
  expect(menuTreeTableSource).toContain('grid-rows-[1fr] opacity-100');
  expect(menuTreeTableSource).not.toContain('data-[state=checked]:bg-success');
  expect(menuFormDialogSource).not.toContain('data-[state=checked]:bg-success');
  expect(menuTreeTableSource).toContain('text-(--table-action-fg)');
  expect(menusPageSource).toContain('PageFrame');
  expect(menusPageSource).toContain('PageSurface');

  const targetSources = [
    tableSource,
    tableShellSource,
    pageScaffoldSource,
    sideListSource,
    paginationSource,
    appearanceDrawerSource,
    shellHeaderSource,
    navMenuSidebarSource,
    navMenuRailSource,
    navMenuInsetSource,
    subsystemSwitcherSource,
  ];
  for (const source of targetSources) {
    for (const primitiveClass of ['text-pri', 'border-pri', 'bg-pri', 'bg-pri-soft', 'bg-surface-2']) {
      expect(source).not.toContain(primitiveClass);
    }
  }
});

test('DataTable TanStack 迁移守卫：无旧状态机、无 checkbox 补丁、无范围外 rowModel', () => {
  expect(dataTableSource).toContain('useReactTable');
  expect(dataTableSource).toContain('getCoreRowModel');
  expect(dataTableSource).toContain('flexRender');
  expect(dataTableSource).toContain("const rowSelectionColumnId = '__row_selection__'");
  expect(dataTableSource).toContain('[selectionColumn, ...columns]');
  expect(dataTableSource).toContain('column.id === rowSelectionColumnId');
  expect(dataTableSource).toContain('getIsAllPageRowsSelected');
  expect(dataTableSource).toContain('getIsSomePageRowsSelected');
  expect(dataTableSource).toContain('toggleAllPageRowsSelected');
  expect(dataTableSource).toContain('getSelectedRowModel');
  expect(dataTableSource).toContain('stopPropagation');
  expect(dataTableSource).not.toMatch(/selectedIds|toggleRow|toggleVisibleRows|resetSelectionKey/);
  expect(dataTableSource).not.toMatch(/DataTableColumn|DataTableLegacySelection|legacyRowSelection|onSelectionChange/);
  expect(dataTableSource).not.toMatch(/selectionColumnWidth|selectionCellClassName|bodyCellWithSelectionClassName/);
  expect(dataTableSource).not.toMatch(/selectionSlotClassName|selectionCheckboxClassName/);
  expect(dataTableSource).not.toContain("id: 'select'");
  expect(dataTableSource).not.toContain("cellIndex === 0 && 'mx-auto w-4'");
  expect(dataTableSource).not.toMatch(/getSortedRowModel|manualSorting|getFilteredRowModel|manualFiltering/);
  expect(dataTableSource).not.toMatch(/getGroupedRowModel|getFacetedRowModel|useVirtualizer/);
  expect(dataTableSource).not.toContain('@/modules/');
  expect(dataTableSource).not.toContain('useTranslation');
  expect(tableSource).not.toMatch(/\[role=checkbox\]|translate-y/);
});

test('主题状态页暴露 DataTable 选择列三态对齐矩阵', () => {
  expect(themeStatesSource).toContain('dataTableSelectionStates');
  expect(themeStatesSource).toContain("id: 'partial'");
  expect(themeStatesSource).toContain("id: 'all'");
  expect(themeStatesSource).toContain("id: 'single'");
  expect(themeStatesSource).toContain('data-testid={`datatable-selection-${state.id}`}');
  expect(themeStatesSource).toContain('dataTableSingleRows');
  expect(themeStatesSource).toContain('rowSelection: state.rowSelection');
  expect(themeStatesSource).toContain('onRowSelectionChange: noopDataTableRowSelectionChange');
  expect(themeStatesSource).toContain("t('dev.themeStates.choiceIndeterminate')");
  expect(themeStatesSource).toContain("t('dev.themeStates.choiceChecked')");
  expect(themeStatesSource).toContain("t('dev.themeStates.dataTableSelected')");
  expect(themeStatesSource).toContain('dataTableLoading');
  expect(themeStatesSource).toContain('dataTableEmpty');
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

test('global.css 必须最先 @import tokens.base.css（flavor 覆盖与 base 默认同特异性，靠源顺序决胜）', () => {
  const imports = [...globalCss.matchAll(/@import '\.\/(tokens\.[a-z]+\.css)';/g)].map((m) => m[1]);
  // 新增 flavor 时同步此数组(tokens.base.css 必须保持第一位)
  expect(imports).toEqual(['tokens.base.css', 'tokens.feishu.css', 'tokens.claude.css', 'tokens.shadcn.css']);
});
