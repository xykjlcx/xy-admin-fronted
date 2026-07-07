# 设计系统 Preset 化 — 基础层实施计划（模型 + 外观面板 + 视觉矩阵）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把「点风格 = 只 setFlavor」升级为「点风格 = 应用完整视觉预设」，并把外观面板重组为 Preset / Theme / Shell 三层，同时建立 3 flavor × 3 scale × 明暗 的视觉矩阵采集基建——为后续 per-flavor 几何/密度/排印 token 补全打好入口与验收护栏。本计划**不改任何 flavor 的视觉 token**，只动模型、面板信息架构与验收工具。

**Architecture:** 新增 `src/lib/design-presets.ts` 承载「视觉轴预设」数据（flavor+accent+radius+scale，不含 layout/pageAnim）；store 新增 `applyPreset` 动作一键套用；外观抽屉按 Preset/Theme/Shell 重排并让风格卡走 `applyPreset`；`/dev/theme-states` 增加显示比例选择器，视觉脚本增加 `matrix` 命令遍历三档比例 × 三风格 × 明暗采集组件矩阵。localStorage key、FOUC 契约、store 持久化结构一律不动。

**Tech Stack:** Vite + React + TypeScript + Zustand(persist) + TanStack Router + Tailwind v4 + Vitest(jsdom) + agent-browser CLI。

**来源 PRD:** `docs/superpowers/specs/2026-07-07-shadcn-create-inspired-design-system-prd.md`（Phase 1 / Phase 2 / Phase 2b 第 0 切片）。

---

## 作者裁剪说明（执行者必读，勿盲抄 PRD ceremony）

PRD §7.1 列了 `appearanceToDesignSystem()` / `designSystemToAppearancePatch()` 双向转换与 `DesignSystemPreset` 完整类型。本计划按 YAGNI / 反过度工程做两处裁剪，**属刻意为之，不是遗漏**：

1. **只做 preset→patch 单向（`applyPreset`），不做反向 `matchActivePreset`。** 抽屉风格卡的「选中态」沿用现有「flavor 家族匹配」（`flavor === key`），不需要反向精确匹配当前状态命中哪个预设。反向匹配当前**零消费方**，等真要做「预设未修改 / 一键还原预设」指示器时再加。
2. **不重构 store 持久化结构。** `layout/pageAnim/collapsed` 在 store 里保持扁平字段不变（避免动 localStorage 与 FOUC 契约）。「视觉轴 vs Shell 轴」的分离只体现在两处：① preset 对象**不含** layout/pageAnim；② 抽屉 UI 把它们归到 Shell 分组。不引入 `data-style/data-scale` 新 dataset（纯改名是 churn，PRD §11 已定）。
3. **font / menuColor / menuAccent 不进类型、不实现**（PRD §10 头号风险「幻想轴」，仓库零 token 支撑）。

---

## 前置检查

- [ ] **确认分支并切出特性分支**（当前在 `main`，不直接在主干开发）

Run:
```bash
git rev-parse --abbrev-ref HEAD
git switch -c feat/design-preset-foundation
```
Expected: 新分支 `feat/design-preset-foundation` 创建并切换成功。

- [ ] **确认基线绿**（避免把已有失败算到本次头上）

Run:
```bash
./node_modules/.bin/vitest run src/stores/__tests__/appearance.test.ts src/lib/__tests__/appearance-dom.test.ts src/app/shell/widgets/__tests__/AppearanceDrawer.test.tsx
```
Expected: 全部 PASS。

---

## 文件结构

| 文件 | 动作 | 职责 |
| --- | --- | --- |
| `src/lib/design-presets.ts` | 创建 | 视觉轴预设数据 `DESIGN_PRESETS` + 类型 `DesignPreset` + `presetToPatch()` |
| `src/lib/__tests__/design-presets.test.ts` | 创建 | 预设数据契约测试 |
| `src/stores/appearance.ts` | 修改 | 新增 `applyPreset(key)` 动作 |
| `src/stores/__tests__/appearance.test.ts` | 修改 | 追加 `applyPreset` 行为测试 |
| `docs/superpowers/specs/SHADCN-SYNC-POLICY.md` | 创建 | §7.2 官方 shadcn 源码同步治理规则（动组件前立规矩） |
| `src/locales/zh-CN/common.json` | 修改 | 抽屉分组标题文案（Preset/Theme/Shell）+ 显示比例 dev 标签 |
| `src/locales/en-US/common.json` | 修改 | 同上英文 |
| `src/app/shell/widgets/AppearanceDrawer.tsx` | 修改 | 重排为 Preset/Theme/Shell；风格卡改走 `applyPreset` |
| `src/app/shell/widgets/__tests__/AppearanceDrawer.test.tsx` | 修改 | 追加「点风格卡套用完整预设」测试 |
| `src/routes/_auth/dev/theme-states.tsx` | 修改 | 增加显示比例(scale)选择器 + 给 flavor/mode/scale 选择器加 `data-matrix` 钩子 |
| `scripts/visual-agent-browser.mjs` | 修改 | 新增 `matrix` 命令：登录 → `/dev/theme-states` → 遍历 3 flavor × 3 scale × 明暗采集 + 无横向溢出断言 |
| `package.json` | 修改 | 新增 `visual:matrix` 脚本 |

---

# Part A — Phase 1：Preset 模型（无视觉变化）

## Task 1：视觉轴预设数据与转换

**Files:**
- Create: `src/lib/design-presets.ts`
- Test: `src/lib/__tests__/design-presets.test.ts`

- [ ] **Step 1: 写失败测试**

Create `src/lib/__tests__/design-presets.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { DESIGN_PRESETS, presetToPatch } from '@/lib/design-presets';

describe('design-presets', () => {
  it('每个 flavor 有一套完整视觉预设，accent 与 flavor 默认色一致', () => {
    expect(DESIGN_PRESETS.feishu).toEqual({ flavor: 'feishu', accent: 'blue', radius: 'default', scale: 'md' });
    expect(DESIGN_PRESETS.claude).toEqual({ flavor: 'claude', accent: 'claude', radius: 'default', scale: 'md' });
    expect(DESIGN_PRESETS.shadcn).toEqual({ flavor: 'shadcn', accent: 'shadcn', radius: 'default', scale: 'md' });
  });

  it('presetToPatch 返回视觉轴，不含 layout/pageAnim（Shell 轴不进视觉预设）', () => {
    const patch = presetToPatch('claude');
    expect(patch).not.toHaveProperty('layout');
    expect(patch).not.toHaveProperty('pageAnim');
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `./node_modules/.bin/vitest run src/lib/__tests__/design-presets.test.ts`
Expected: FAIL，报 `Failed to resolve import "@/lib/design-presets"` 或 `DESIGN_PRESETS is not defined`。

- [ ] **Step 3: 写最小实现**

Create `src/lib/design-presets.ts`:
```ts
// src/lib/design-presets.ts —— 视觉轴「设计预设」数据层。
// 一套预设 = 视觉轴的完整取值（flavor + accent + radius + scale）；
// 刻意不含 layout / pageAnim —— 那是 Shell 结构轴，不进视觉预设（PRD §6.2）。
// accent 复用 flavorDefaultAccent 作单一真相源，避免与 appearance-dom 的默认色表 drift。
import { flavorDefaultAccent, type Flavor, type AccentKey, type Radius, type Zoom } from './appearance-dom';

export interface DesignPreset {
  flavor: Flavor;
  accent: AccentKey;
  radius: Radius;
  // 命名对齐 PRD 的 zoom→scale 语义；store 侧字段仍叫 zoom，applyPreset 处做映射。
  scale: Zoom;
}

function presetFor(flavor: Flavor): DesignPreset {
  return { flavor, accent: flavorDefaultAccent(flavor), radius: 'default', scale: 'md' };
}

export const DESIGN_PRESETS: Record<Flavor, DesignPreset> = {
  feishu: presetFor('feishu'),
  claude: presetFor('claude'),
  shadcn: presetFor('shadcn'),
};

export function presetToPatch(key: Flavor): DesignPreset {
  return DESIGN_PRESETS[key];
}
```

- [ ] **Step 4: 运行确认通过**

Run: `./node_modules/.bin/vitest run src/lib/__tests__/design-presets.test.ts`
Expected: PASS（2 个用例）。

- [ ] **Step 5: 提交**

```bash
git add src/lib/design-presets.ts src/lib/__tests__/design-presets.test.ts
git commit -m "feat(appearance): 新增视觉轴设计预设数据层 DESIGN_PRESETS"
```

## Task 2：store 新增 applyPreset 动作

**Files:**
- Modify: `src/stores/appearance.ts`
- Test: `src/stores/__tests__/appearance.test.ts`

- [ ] **Step 1: 追加失败测试**

在 `src/stores/__tests__/appearance.test.ts` 末尾（`rehydrate` 用例**之前**插入，避免破坏「本用例须在文件最后」的约束）追加：
```ts
test('applyPreset 一键应用完整视觉预设（flavor+accent+radius+scale），覆盖用户细调轴', () => {
  useAppearance.getState().set({ flavor: 'feishu', accent: 'blue', radius: 'round', zoom: 'lg' });
  useAppearance.getState().applyPreset('claude');
  const s = useAppearance.getState();
  expect(s.flavor).toBe('claude');
  expect(s.accent).toBe('claude');
  expect(s.radius).toBe('default'); // preset 覆盖视觉轴
  expect(s.zoom).toBe('md');        // preset 覆盖视觉轴
});

test('applyPreset 不改 layout/pageAnim（Shell 轴独立于视觉预设）', () => {
  useAppearance.getState().set({ layout: 'rail', pageAnim: 'slide' });
  useAppearance.getState().applyPreset('shadcn');
  const s = useAppearance.getState();
  expect(s.layout).toBe('rail');
  expect(s.pageAnim).toBe('slide');
});
```

- [ ] **Step 2: 运行确认失败**

Run: `./node_modules/.bin/vitest run src/stores/__tests__/appearance.test.ts -t applyPreset`
Expected: FAIL，报 `useAppearance.getState().applyPreset is not a function`。

- [ ] **Step 3: 写最小实现**

在 `src/stores/appearance.ts`：

3a. 顶部 import 增补（`design-presets`）：
```ts
import { presetToPatch } from '@/lib/design-presets';
```

3b. `AppearanceStore` 接口在 `setFlavor` 行下方加一行声明：
```ts
  applyPreset: (key: AppearanceState['flavor']) => void; // 一键套用完整视觉预设（视觉轴，不含 layout/pageAnim）
```

3c. store 实现里，`setFlavor` 那一行下方加入 `applyPreset`（注意 preset 的 `scale` 映射到 store 的 `zoom`）：
```ts
      applyPreset: (key) => {
        const p = presetToPatch(key); // scale→zoom：视觉预设的 scale 落到 store 的 zoom 字段
        get().set({ flavor: p.flavor, accent: p.accent, radius: p.radius, zoom: p.scale });
      },
```

- [ ] **Step 4: 运行确认通过**

Run: `./node_modules/.bin/vitest run src/stores/__tests__/appearance.test.ts`
Expected: PASS（含新增 2 用例与原有全部用例；`rehydrate` 用例仍在最后正常通过）。

- [ ] **Step 5: 提交**

```bash
git add src/stores/appearance.ts src/stores/__tests__/appearance.test.ts
git commit -m "feat(appearance): store 新增 applyPreset 一键套用完整视觉预设"
```

## Task 3：官方 shadcn 同步治理规则文档化（动组件前立规矩）

**Files:**
- Create: `docs/superpowers/specs/SHADCN-SYNC-POLICY.md`

> 说明：本任务是纯文档，无测试。它是 PRD §7.2 的 P0——必须**先于**任何未来「动组件源码」的阶段落地，故放本计划（虽本计划自身不动组件）。

- [ ] **Step 1: 写规则文档**

Create `docs/superpowers/specs/SHADCN-SYNC-POLICY.md`:
```markdown
# 官方 shadcn 源码同步治理规则

> 权威来源：`2026-07-07-shadcn-create-inspired-design-system-prd.md` §7.2。
> 本仓库是 shadcn source-code 模式（`components.json` 存在）。官方源码是**上游参考**，不是覆盖源。

## 铁律

1. **禁止对已定制组件 `--overwrite`。** 会丢失本地 `--app-scale`、组件族 token、变体扩展、`.ui-*` 状态机挂载。
2. **官方源码进来只经 diff 人工合并**，标准流程：
   - `pnpm dlx shadcn@latest add <component> --dry-run` 看影响面
   - `pnpm dlx shadcn@latest add <component> --diff <file>` 看逐文件差异
   - 已被本仓库 fork/定制的文件：读本地 + 读 diff，人工把上游变化并入，保留本地 token/scale/variant
   - 无本地改动的文件：可直接覆盖
3. **diff 基准钉住 style 无关的 canonical 源码**：`ui.shadcn.com/code/apps/v4/registry/bases/radix/ui/*.tsx`（语义类版本）。
   - 若误用 `/r/styles/{style}` 展平端点做基准，会把 style 间差异当成官方改动。
4. **`components.json` 的 `style` 字段当前是旧世代值 `new-york`**。同步前先确认基准 style，别让 CLI 按错误 style 拉源码。

## 官方新增组件分类

- **直接可用**：未定制、无主题风险（如纯展示组件）→ 可 `add`。
- **需 token 化**：Button/Input/Select/Dialog/Table 等基础控件 → 必须并入 `--*` token 与 `.ui-*` 状态机后才算完成。
- **不接入**：与当前 Pro 层边界冲突或过度复杂的 → 记录理由，不引入。

## 何时用本规则

任何「从官方拉组件源码 / 升级已有组件 / 应用 preset」的动作前，先读本文件。
```

- [ ] **Step 2: 提交**

```bash
git add docs/superpowers/specs/SHADCN-SYNC-POLICY.md
git commit -m "docs(appearance): 固化官方 shadcn 源码同步治理规则（禁 overwrite / diff 基准）"
```

---

# Part B — Phase 2：外观面板重组（Preset / Theme / Shell）

## Task 4：抽屉分组标题文案

**Files:**
- Modify: `src/locales/zh-CN/common.json`
- Modify: `src/locales/en-US/common.json`

- [ ] **Step 1: 加中文键**

在 `src/locales/zh-CN/common.json` 的 `shell.appearanceDrawer` 对象内，`subtitle` 之后加入三个分组标题键：
```json
    "groupPreset": "预设风格",
    "groupTheme": "主题细节",
    "groupShell": "界面框架",
```

- [ ] **Step 2: 加英文键**

在 `src/locales/en-US/common.json` 的 `shell.appearanceDrawer` 对象内对应位置加入：
```json
    "groupPreset": "Preset",
    "groupTheme": "Theme",
    "groupShell": "Shell",
```

- [ ] **Step 3: 校验 JSON 合法 + i18n 键存在**

Run:
```bash
node -e "require('./src/locales/zh-CN/common.json').shell.appearanceDrawer.groupPreset==='预设风格'||process.exit(1);require('./src/locales/en-US/common.json').shell.appearanceDrawer.groupShell==='Shell'||process.exit(1);console.log('ok')"
```
Expected: 打印 `ok`。

- [ ] **Step 4: 提交**

```bash
git add src/locales/zh-CN/common.json src/locales/en-US/common.json
git commit -m "feat(i18n): 外观抽屉 Preset/Theme/Shell 分组标题文案"
```

## Task 5：抽屉重排为 Preset/Theme/Shell + 风格卡套用完整预设

**Files:**
- Modify: `src/app/shell/widgets/AppearanceDrawer.tsx`
- Test: `src/app/shell/widgets/__tests__/AppearanceDrawer.test.tsx`

- [ ] **Step 1: 追加失败测试**

在 `src/app/shell/widgets/__tests__/AppearanceDrawer.test.tsx` 末尾追加：
```ts
test('点风格卡套用完整视觉预设：切 claude 后 radius/zoom 被重置为预设值', async () => {
  const user = userEvent.setup({ pointerEventsCheck: PointerEventsCheckLevel.Never });
  // 先把用户细调轴改成非预设值
  useAppearance.setState({ ...DEFAULTS, radius: 'round', zoom: 'lg' });
  render(
    <TooltipProvider>
      <AppearanceDrawer />
    </TooltipProvider>,
  );

  await user.click(screen.getByRole('button', { name: '外观设置' }));
  await user.click(await screen.findByRole('button', { name: /Claude 风格/ }));

  const s = useAppearance.getState();
  expect(s.flavor).toBe('claude');
  expect(s.accent).toBe('claude');
  expect(s.radius).toBe('default'); // 被完整预设覆盖
  expect(s.zoom).toBe('md');        // 被完整预设覆盖
});

test('分组标题 Preset/Theme/Shell 均渲染', async () => {
  const user = userEvent.setup({ pointerEventsCheck: PointerEventsCheckLevel.Never });
  render(
    <TooltipProvider>
      <AppearanceDrawer />
    </TooltipProvider>,
  );
  await user.click(screen.getByRole('button', { name: '外观设置' }));
  expect(await screen.findByText('预设风格')).toBeInTheDocument();
  expect(screen.getByText('主题细节')).toBeInTheDocument();
  expect(screen.getByText('界面框架')).toBeInTheDocument();
});
```

- [ ] **Step 2: 运行确认失败**

Run: `./node_modules/.bin/vitest run src/app/shell/widgets/__tests__/AppearanceDrawer.test.tsx`
Expected: FAIL —— 新用例找不到「预设风格」文本；且旧行为下点 claude 不会重置 radius/zoom。

- [ ] **Step 3: 改抽屉——引入 GroupTitle、切 applyPreset、重排分组**

3a. import 增补 `applyPreset`（替换现有 `setFlavor` 的取值那一行，保留 `set`）。找到：
```tsx
  const set = useAppearance((s) => s.set);
  const setFlavor = useAppearance((s) => s.setFlavor);
```
改为：
```tsx
  const set = useAppearance((s) => s.set);
  const applyPreset = useAppearance((s) => s.applyPreset);
```

3b. 在 `SectionTitle` 组件定义下方新增 `GroupTitle`（比 SectionTitle 更大、作分组主标题）：
```tsx
function GroupTitle({ children }: { children: string }) {
  return (
    <div className="mb-1 mt-7 border-b border-border pb-1.5 text-[calc(11px*var(--app-scale))] font-bold uppercase tracking-wider text-text-3 first:mt-0">
      {children}
    </div>
  );
}
```

3c. 把整个 `<div className="px-6 pb-8"> ... </div>` 主体**整体替换**为下面重排后的版本（三分组：Preset=风格卡；Theme=主题色/圆角/显示比例；Shell=导航布局/页面动画）。风格卡 `onClick` 改为 `applyPreset`；选中态仍按 `flavor === f.key`（家族匹配，见裁剪说明 1）。

> 执行提示：Edit 需精确 old_string——先 Read `AppearanceDrawer.tsx`，从 `<div className="px-6 pb-8">`（现 L89）截到与它配对的 `</div>`（现 L269，含内部 flavor/layout/accent/pageAnim/zoom/radius 六段），整块作为 old_string 替换。`LayoutThumb` 函数在文件末尾、不在替换范围，勿动。

```tsx
        <div className="px-6 pb-8">
          {/* ===== Preset：预设风格（点一下套用完整视觉预设） ===== */}
          <GroupTitle>{dk('groupPreset')}</GroupTitle>
          <div className="flex flex-col gap-2.5">
            {FLAVOR_OPTS.map((f) => (
              <button
                key={f.key}
                onClick={() => applyPreset(f.key as Flavor)}
                className={cn(
                  'flex items-center gap-3 rounded-11 border p-2.5 text-left transition-colors',
                  flavor === f.key
                    ? 'border-(--nav-item-fg-current) bg-(--nav-item-bg-current)'
                    : 'border-border bg-surface',
                )}
              >
                <span className="flex shrink-0 gap-1 rounded-9 p-2" style={{ background: f.preset.chrome }}>
                  <span className="size-[calc(15px*var(--app-scale))] rounded-5" style={{ background: f.preset.pri }} />
                  <span
                    className="size-[calc(15px*var(--app-scale))] rounded-5 border border-border"
                    style={{ background: f.preset.chrome }}
                  />
                  <span className="size-[calc(15px*var(--app-scale))] rounded-5" style={{ background: f.preset.surface2 }} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-text">{dk(f.label)}</div>
                  <div className="text-xs text-text-3">{dk(f.desc)}</div>
                </div>
                {flavor === f.key && <Check className="size-[calc(17px*var(--app-scale))] shrink-0 text-(--nav-item-fg-current)" />}
              </button>
            ))}
          </div>

          {/* ===== Theme：主题细节（细调轴，独立于预设） ===== */}
          <GroupTitle>{dk('groupTheme')}</GroupTitle>

          <SectionTitle>{dk('accent')}</SectionTitle>
          <div className="grid grid-cols-6 gap-2">
            {ACCENTS.map((a) => (
              <button key={a.key} onClick={() => set({ accent: a.key })} className="flex flex-col items-center gap-1.5">
                <span
                  className="flex h-11 w-full items-center justify-center rounded-11 transition-transform"
                  style={{ background: a.pri, boxShadow: accent === a.key ? RING(a.pri) : OUTLINE }}
                >
                  {accent === a.key && <Check className="size-[calc(17px*var(--app-scale))] text-white" />}
                </span>
                <span className="text-[calc(10px*var(--app-scale))] text-text-3">{dk(a.labelKey)}</span>
              </button>
            ))}
            <label className="flex cursor-pointer flex-col items-center gap-1.5">
              <span
                className="relative flex h-11 w-full items-center justify-center rounded-11"
                style={{
                  background: accent === 'custom' ? customAccent : CUSTOM_ACCENT_GRADIENT,
                  boxShadow: accent === 'custom' ? RING(customAccent) : OUTLINE,
                }}
              >
                {accent === 'custom' ? <Check className="size-4 text-white" /> : <Plus className="size-4 text-white" />}
                <input
                  type="color"
                  value={isValidHex(customAccent) ? customAccent : ACCENTS[0].pri}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (isValidHex(v)) set({ accent: 'custom', customAccent: v });
                  }}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </span>
              <span className="text-[calc(10px*var(--app-scale))] text-text-3">{dk('accentCustom')}</span>
            </label>
          </div>

          <SectionTitle>{dk('radius')}</SectionTitle>
          <div className="flex gap-2">
            {RADIUS_OPTS.map((o) => (
              <button
                key={o.key}
                onClick={() => set({ radius: o.key })}
                className={cn(
                  'flex h-[calc(76px*var(--app-scale))] flex-1 flex-col items-center justify-center gap-2 rounded-9 border text-[calc(13px*var(--app-scale))] transition-colors',
                  radius === o.key
                    ? 'border-(--nav-item-fg-current) bg-(--nav-item-bg-current) text-(--nav-item-fg-current)'
                    : 'border-border bg-surface text-text-2',
                )}
              >
                <span
                  className="size-[calc(34px*var(--app-scale))] border-2"
                  style={{
                    borderColor: radius === o.key ? 'var(--nav-item-fg-current)' : 'var(--text-3)',
                    borderTopLeftRadius: o.r,
                    background: radius === o.key ? 'var(--nav-item-bg-current)' : 'transparent',
                  }}
                />
                <span>{dk(o.label)}</span>
              </button>
            ))}
          </div>
          <div className="mt-2 text-xs text-text-3">{dk('radiusHint')}</div>

          <SectionTitle>{dk('zoom')}</SectionTitle>
          <div className="flex gap-2">
            {ZOOM_OPTS.map((o) => (
              <button
                key={o.key}
                onClick={() => set({ zoom: o.key })}
                className={cn(
                  'flex h-[calc(52px*var(--app-scale))] flex-1 flex-col items-center justify-center gap-0.5 rounded-9 border transition-colors',
                  zoom === o.key
                    ? 'border-(--nav-item-fg-current) bg-(--nav-item-bg-current) text-(--nav-item-fg-current)'
                    : 'border-border bg-surface text-text-2',
                )}
              >
                <span className="text-sm font-semibold">{dk(o.label)}</span>
                <span className="text-[calc(11px*var(--app-scale))] opacity-70">{dk(o.hint)}</span>
              </button>
            ))}
          </div>
          <div className="mt-2 text-xs text-text-3">{dk('zoomHint')}</div>

          {/* ===== Shell：界面框架（结构轴，不进视觉预设） ===== */}
          <GroupTitle>{dk('groupShell')}</GroupTitle>

          <SectionTitle>{dk('layout')}</SectionTitle>
          <div className="grid grid-cols-3 gap-2.5">
            {(['sidebar', 'rail', 'inset'] as const).map((k) => (
              <button
                key={k}
                onClick={() => set({ layout: k })}
                className={cn(
                  'relative flex flex-col gap-2 rounded-12 border p-2 transition-colors',
                  layout === k
                    ? 'border-(--nav-item-fg-current) bg-(--nav-item-bg-current)'
                    : 'border-border bg-(--table-header-bg)',
                )}
              >
                <LayoutThumb kind={k} />
                <div className="text-center">
                  <div className="text-xs font-semibold text-text">
                    {dk(`layout${k[0]!.toUpperCase()}${k.slice(1)}`)}
                  </div>
                  <div className="text-[calc(10px*var(--app-scale))] text-text-3">
                    {dk(`layout${k[0]!.toUpperCase()}${k.slice(1)}Desc`)}
                  </div>
                </div>
                {layout === k && (
                  <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-(--nav-item-fg-current)">
                    <Check className="size-2.5 text-white" />
                  </span>
                )}
              </button>
            ))}
          </div>

          <SectionTitle>{dk('pageAnim')}</SectionTitle>
          <div className="flex gap-2">
            {ANIM_OPTS.map((k) => (
              <button
                key={k}
                onClick={() => set({ pageAnim: k })}
                className={cn(
                  'h-9 flex-1 rounded-8 border text-[calc(13px*var(--app-scale))] transition-colors',
                  pageAnim === k
                    ? 'border-(--nav-item-fg-current) bg-(--nav-item-bg-current) font-semibold text-(--nav-item-fg-current)'
                    : 'border-border bg-surface text-text-2',
                )}
              >
                {dk(ANIM_LABEL[k]!)}
              </button>
            ))}
          </div>
          <div className="mt-2 text-xs text-text-3">{dk('pageAnimHint')}</div>
        </div>
```

- [ ] **Step 4: 运行确认通过**

Run: `./node_modules/.bin/vitest run src/app/shell/widgets/__tests__/AppearanceDrawer.test.tsx`
Expected: PASS（原「切 shadcn」用例 + 新 2 用例）。

> 说明：原「切 shadcn 风格并使用其中性默认主题色」用例仍成立——`applyPreset('shadcn')` 同样把 accent 设为 shadcn。

- [ ] **Step 5: 类型 + lint 校验**

Run:
```bash
./node_modules/.bin/tsc -b --noEmit
./node_modules/.bin/eslint src/app/shell/widgets/AppearanceDrawer.tsx src/lib/design-presets.ts src/stores/appearance.ts
```
Expected: 均无报错。（注意确认 `setFlavor` 已无残留引用，否则 TS 报未使用变量。）

- [ ] **Step 6: 提交**

```bash
git add src/app/shell/widgets/AppearanceDrawer.tsx src/app/shell/widgets/__tests__/AppearanceDrawer.test.tsx
git commit -m "feat(shell): 外观抽屉重组为 Preset/Theme/Shell，风格卡套用完整视觉预设"
```

---

# Part C — Phase 2b 第 0 切片：视觉矩阵采集基建

> 目标：建立 3 flavor × 3 scale × 明暗 = 18 格的组件矩阵采集 + 无横向溢出断言，作为后续 per-flavor token 补全的验收护栏。**本切片只采集 + 断言溢出，不做 baseline diff**（diff 需先有 committed baseline，属后续切片；此处先把harness 与网格建起来）。

## Task 6：`/dev/theme-states` 增加显示比例选择器 + 矩阵钩子

**Files:**
- Modify: `src/routes/_auth/dev/theme-states.tsx`
- Modify: `src/locales/zh-CN/common.json`、`src/locales/en-US/common.json`（dev.themeStates.scale 标签）

> 前提已核实（2026-07-07）：`src/components/ui/native-select.tsx` 第 34/41 行 `...props` 透传到底层 `<select>`，`data-matrix` 会正常落到 DOM——直接用 `data-matrix` 钩子，无需外层包裹。

- [ ] **Step 1: 加 scale 标签文案**

`src/locales/zh-CN/common.json` 的 `dev.themeStates` 对象内加：
```json
    "scale": "显示比例",
```
`src/locales/en-US/common.json` 的 `dev.themeStates` 对象内加：
```json
    "scale": "Scale",
```

- [ ] **Step 2: theme-states 顶部加 scale 常量**

在 `src/routes/_auth/dev/theme-states.tsx` 的 `const flavors = [...]` 附近加：
```tsx
const scales = ['sm', 'md', 'lg'] as const;
```

- [ ] **Step 3: 组件内取 zoom 状态**

真实代码 `theme-states.tsx:130` 用整体解构取状态：`const { flavor, mode, accent, customAccent, set, setFlavor } = useAppearance();`。往这个解构里加 `zoom`（勿新增独立 `useAppearance((s) => s.zoom)` 订阅——与该文件风格不符、且多一次冗余订阅）：
```tsx
  const { flavor, mode, accent, customAccent, zoom, set, setFlavor } = useAppearance();
```
（若已含 `zoom` 则跳过。）

- [ ] **Step 4: 给 flavor/mode 选择器加 data-matrix 钩子 + 新增 scale 选择器**

在那段 `md:grid-cols-4` 的控制区（flavor / mode / accent / customAccent 四控件），把 flavor 的 `<NativeSelect ...>` 加 `data-matrix="flavor"`，mode 的加 `data-matrix="mode"`，并在 accent 之前或之后新增第五个「显示比例」控件：
```tsx
        <label className="flex flex-col gap-1.5 text-sm font-medium text-text">
          {t('dev.themeStates.scale')}
          <NativeSelect
            data-matrix="scale"
            value={zoom}
            onChange={(event) => set({ zoom: event.currentTarget.value as typeof zoom })}
          >
            {scales.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </NativeSelect>
        </label>
```
同时把该区外层 `md:grid-cols-4` 改为 `md:grid-cols-5`（容纳新控件不换行）。flavor 选择器补 `data-matrix="flavor"`，mode 选择器补 `data-matrix="mode"`。

- [ ] **Step 5: 类型 + lint + 手动确认渲染**

Run:
```bash
./node_modules/.bin/tsc -b --noEmit
./node_modules/.bin/eslint src/routes/_auth/dev/theme-states.tsx
```
Expected: 无报错。

- [ ] **Step 6: 提交**

```bash
git add src/routes/_auth/dev/theme-states.tsx src/locales/zh-CN/common.json src/locales/en-US/common.json
git commit -m "feat(dev): theme-states 增加显示比例选择器与矩阵采集钩子"
```

## Task 7：视觉脚本新增 matrix 命令

**Files:**
- Modify: `scripts/visual-agent-browser.mjs`
- Modify: `package.json`

- [ ] **Step 1: 加 matrix 采集函数**

在 `scripts/visual-agent-browser.mjs` 的 `main()` 定义**之前**，加入以下函数（复用文件内已存在的 `agent`、`evalIn`、`ensureDir`、`ensureDevServer`、`setViewport`、`loginAsAdmin`、`assertNoHorizontalOverflow`、`reportDir`、`baseOrigin`、`path`、`root`）：
```js
function setMatrixSelect(session, matrixKey, value) {
  evalIn(
    session,
    `
    const el = document.querySelector('select[data-matrix=${JSON.stringify(matrixKey)}]');
    if (!el) throw new Error('matrix select not found: ${matrixKey}');
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
    setter.call(el, ${JSON.stringify(value)});
    el.dispatchEvent(new Event('change', { bubbles: true }));
    true;
    `,
  );
}

async function runThemeMatrix() {
  const matrixDir = path.join(reportDir, 'theme-matrix');
  await ensureDir(matrixDir);
  const server = await ensureDevServer();
  const cells = [];
  try {
    setViewport(appSession);
    loginAsAdmin(appSession);
    agent(appSession, ['open', new URL('/dev/theme-states', baseOrigin).href]);
    agent(appSession, ['wait', '1000']);

    for (const flavor of ['feishu', 'claude', 'shadcn']) {
      for (const mode of ['light', 'dark']) {
        for (const scale of ['sm', 'md', 'lg']) {
          setMatrixSelect(appSession, 'flavor', flavor);
          setMatrixSelect(appSession, 'mode', mode);
          setMatrixSelect(appSession, 'scale', scale);
          agent(appSession, ['wait', '350']);
          assertNoHorizontalOverflow(appSession);
          const file = path.join(matrixDir, `${flavor}-${mode}-${scale}.png`);
          agent(appSession, ['screenshot', file]);
          cells.push({ flavor, mode, scale, file: path.relative(root, file) });
        }
      }
    }
    return { cells, serverReused: server.reused };
  } finally {
    await server.stop();
  }
}
```

- [ ] **Step 2: 接入 main() 的命令分发**

在 `main()` 里，`command === 'scale'` 分支之后加：
```js
  if (command === 'matrix' || command === 'all') {
    data.matrix = await runThemeMatrix();
  }
```
并把命令白名单那行：
```js
  if (!['baseline', 'app', 'scale', 'all'].includes(command)) {
```
改为：
```js
  if (!['baseline', 'app', 'scale', 'matrix', 'all'].includes(command)) {
```

- [ ] **Step 3: report 补矩阵段落**

在 `writeReport(data)` 的 `data.scale?.results` 段之后加：
```js
  if (data.matrix?.cells?.length) {
    lines.push('## 主题矩阵（flavor × mode × scale）', '');
    for (const cell of data.matrix.cells) {
      lines.push(`- ${cell.flavor} / ${cell.mode} / ${cell.scale}: ${cell.file}`);
    }
    lines.push('');
  }
```

- [ ] **Step 4: package.json 加脚本**

在 `package.json` 的 `scripts` 里，`visual:scale` 之后加：
```json
    "visual:matrix": "node scripts/visual-agent-browser.mjs matrix",
```

- [ ] **Step 5: 实跑矩阵采集（e2e 验收，必须真跑）**

> 依赖 `agent-browser` CLI 可用。若环境无该 CLI，明确记录「未实跑」并把原因写进任务文档，不得宣称完成。

Run:
```bash
pnpm visual:matrix
```
Expected: `test-results/m0-visual/theme-matrix/` 下生成 18 张 `{flavor}-{mode}-{scale}.png`；过程无 `horizontal overflow` 抛错；`report.md` 含「主题矩阵」段列出 18 格。

- [ ] **Step 6: 抽查 3 张截图确认风格差异真实呈现**

用 Read 工具打开 `test-results/m0-visual/theme-matrix/feishu-light-md.png`、`claude-light-md.png`、`shadcn-dark-lg.png`，肉眼确认：三风格主色/输入框/按钮确有差异；dark 档确为暗色；lg 档明显更大。

- [ ] **Step 7: 提交**

```bash
git add scripts/visual-agent-browser.mjs package.json
git commit -m "feat(visual): 新增 theme-matrix 命令采集 3 flavor × 3 scale × 明暗矩阵"
```

---

## 全量验证（本计划收尾）

- [ ] **跑齐守卫与测试**

Run:
```bash
./node_modules/.bin/tsc -b --noEmit
./node_modules/.bin/eslint src
./node_modules/.bin/vitest run
pnpm theme:guard
```
Expected: 全绿。`theme:guard` 不退化（本计划未动 token/primitive class，snapshot 与 baseline 不应变化）。

- [ ] **确认无视觉 token 改动**

Run: `git diff --stat main -- src/styles/`
Expected: **空**（本计划不碰 `src/styles/**`，视觉 token 零改动，符合「Phase 1/2 不改视觉」约束）。

---

## Self-Review（作者自检，已执行）

**1. Spec 覆盖：**
- PRD Phase 1（模型/转换、applyAppearance 边界、§7.2 文档）→ Task 1/2/3 ✅。
  - 注：本计划未新增 `applyDesignSystemPreset` DOM 层重构（PRD Phase 1 的可选项）——现有 `applyAppearance` 已是唯一 DOM 出口且行为不变，`applyPreset` 走 store.set→applyAppearance 复用它，无需新 DOM 层。Provider 化（PRD §7.3 P1）留后续计划。
- PRD Phase 2（Preset/Theme/Shell 重组、一键预设、layout/pageAnim 剥离）→ Task 4/5 ✅。
- PRD Phase 2b 第 0 切片（视觉矩阵自动化）→ Task 6/7 ✅（diff-vs-baseline 明确延后，已在 Part C 抬头声明）。

**2. 占位符扫描：** 无 TBD/TODO；每个改代码步骤均含完整代码或精确 sed/键值。Task 6 Step 1 的 NativeSelect 透传是「先验证再决定」的显式分支，非占位符。

**3. 类型一致性：** `DesignPreset.scale` ↔ store `zoom` 的映射在 Task 1（定义）与 Task 2（`zoom: p.scale`）一致；`applyPreset` 签名 `(key: Flavor)=>void` 在接口声明、实现、抽屉调用三处一致；`presetToPatch`/`DESIGN_PRESETS` 命名跨 Task 1/2 一致。

**4. 风险点已在计划内消解：** localStorage/FOUC 契约不动（裁剪说明 2）；`setFlavor` 移除后的 TS 未使用检查（Task 5 Step 5 显式提示）；矩阵采集不清 auth（复用 loginAsAdmin，setMatrixSelect 只改 select 不碰 localStorage）。

---

## 执行交接

**计划已保存到 `docs/superpowers/plans/2026-07-07-design-system-preset-foundation.md`。两种执行方式：**

1. **Subagent-Driven（推荐）** — 每个 Task 派新 subagent 执行，Task 间两阶段 review，迭代快。
2. **Inline Execution** — 本会话内按 executing-plans 批量执行，设检查点 review。

**选哪种？**
