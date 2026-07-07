# Field 族 per-flavor 水平内距密度 token 实施计划（Phase 2b 首切片 / playbook）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给三套风格（feishu/claude/shadcn）的输入类控件水平内距做「按 flavor 分档」——新增 `--field-px` 组件族密度 token，让 5 个 field 组件从硬编码 `px-3` 改为消费 token，兑现「claude 宽松纸面 vs feishu/shadcn 紧凑」的密度差异。

**Architecture:** 在 `tokens.css` 的 `:root`（feishu 默认）声明 `--field-px: calc(12px * var(--app-scale))`，在 `[data-flavor='claude']` 块覆盖为 `16px`，shadcn 继承默认 12px。field 组件（Input/InputGroup/InputGroupAddon/NativeSelect/SelectTrigger/Textarea）把 `px-3` 换成 Tailwind v4 变量简写 `px-(--field-px)`；SearchField 去掉不一致的 `px-2.5` 覆盖，继承 InputGroup 的 `--field-px`。值表来源先回填三份 `design.md` 的 `text-input.padding`。**绝不碰全局 `--spacing`**（PRD §7.5 红线：全局分叉会引发业务页布局漂移）。

**Tech Stack:** Vite + React + TypeScript + Tailwind CSS v4 + Vitest(jsdom) + agent-browser CLI。

**来源 PRD:** `docs/superpowers/specs/2026-07-07-shadcn-create-inspired-design-system-prd.md` §7.5 / §7.7（Phase 2b 首个「量」维度切片）。

---

## 作者裁剪说明（执行者必读，勿盲抄 PRD）

三路源码 recon（2026-07-07）揭示了 PRD §7.5 没料到的现实，本计划据此收窄范围，**属刻意为之**：

1. **Card 密度不做。** 全仓库**无 Card 组件、无 `--card-*` token、无挂点**——「卡片」是各页面手写 `p-5`/`p-6`/`p-4`。`--card-spacing` 没有消费组件可挂，要先建 Card/Surface 组件收敛散落 padding，那是 Phase 3（组件收敛）的活。强行塞进本切片会踩 `spec-assumes-existing-code-supports`。Card 密度随 Phase 3 建 Card 组件时一并做。
2. **Table 密度不做（留第二切片）。** 两套表格几何**不一致**（`ui/table.tsx` `px-3`/`h-11` vs `pro/TableShell.tsx` `px-2`/`h-14`），token 化前要先统一两套值 + 处理「td 靠 py 无固定高 vs 固定行高」的机制差异——这是独立工作量，混进 playbook 会稀释纯度。作为 Phase 2b 第二个密度切片单独做。
3. **只做水平内距（`px`），不做垂直内距/行高/字号。** 本切片是 Phase 2b 的 playbook，把「值表回填 → token → 分 flavor 覆盖 → 组件消费 → 护栏 → 矩阵验收」四步流程跑通钉死；其余维度（字号阶梯、控件高度、ring、阴影）按同骨架各自成切片。
4. **不新建 dataset、不动 store、不改 `--spacing`、不改 FOUC。** 纯 token 新增 + 组件 className 替换。**一处刻意例外**：SearchField 是本切片改造的 Pro 组件，按 CLAUDE.md「新增或改造基础 UI/Pro 组件时必须同步更新 `/dev/theme-states` 状态矩阵…没有状态矩阵的 token 化不算完成」纪律，Task 3.5 会往 theme-states 补一个 SearchField 实例（进 18 格 theme-matrix 做确定性验证）+ 对齐其手抄 Select 演示块的 `px-3`。这是合规要求（SearchField 是全切片唯一影响真实业务页面所有 flavor 的改动，必须最强验证），非镀金。

---

## 护栏配合结论（recon 已核实，执行时照此，勿临时试）

| 护栏 | 对本切片的反应 | 要做的 |
| --- | --- | --- |
| `theme:guard` 引用完整性（`theme-guards.test.ts` Test 1） | 组件里 `px-(--field-px)` 会被抓为对 `--field-px` 的引用，**必须先在 tokens.css 声明否则红** | Task 2 先声明，Task 3 再消费（顺序不可倒） |
| `theme:guard` 三个颜色禁令（Test 2/3/4，含 field 颜色允许清单 L72-109） | padding 类**天然免疫**（清单全是颜色/边框/ring 类，无 padding） | 零改动 |
| `tokens.snapshot.test.ts` | 加法式白名单 `toContain`，新 token **不被动变红**；要守护需主动加断言 | Task 2 往 `MUST_CONTAIN` 加断言 + 加 claude 覆盖 test |
| `design:lint`（对比度棘轮） | 纯 `padding` 值无 bg+fg 配对，**静默通过** | 零改动 |

---

## 前置检查

- [ ] **确认分支并切出特性分支**（当前在 `main`，不直接在主干开发）

Run:
```bash
git rev-parse --abbrev-ref HEAD
git switch -c feat/design-density-field
```
Expected: 新分支 `feat/design-density-field` 创建并切换成功。

- [ ] **确认基线绿**（避免把已有失败算到本次头上）

> ⚠️ vitest 的位置参数是对默认 include glob 的**子串过滤**，不是精确路径解析。若存在并发 git worktree（`.claude/worktrees/`，如对抗验证残留），会一并扫到副本里的同名测试、污染结果（实测复现过：读到 4 文件 2 失败的假象）。**本计划所有 `vitest run <路径>` 步骤统一加 `--exclude '.claude/**'`**，或先 `ls .claude/worktrees` 确认无残留。

Run:
```bash
./node_modules/.bin/vitest run --exclude '.claude/**' src/styles/__tests__/tokens.snapshot.test.ts src/styles/__tests__/theme-guards.test.ts
```
Expected: 全部 PASS。

---

## 文件结构

| 文件 | 动作 | 职责 |
| --- | --- | --- |
| `docs/design/feishu.design.md` | 修改 | `text-input` 回填 `padding: 0 12px` |
| `docs/design/claude.design.md` | 修改 | `text-input` 回填 `padding: 0 16px`（宽松档） |
| `docs/design/shadcn.design.md` | 不改 | 已有 `padding: 0 12px`，仅核对 |
| `src/styles/tokens.css` | 修改 | `:root` 加 `--field-px`（12px）；`[data-flavor='claude']` 覆盖 16px |
| `src/styles/__tests__/tokens.snapshot.test.ts` | 修改 | `MUST_CONTAIN` 加 `--field-px` 默认断言 + 新增 claude 覆盖 test |
| `src/components/ui/input.tsx` | 修改 | inputVariants / InputGroup / InputGroupAddon 的 `px-3` → `px-(--field-px)` |
| `src/components/ui/native-select.tsx` | 修改 | `px-3` → `px-(--field-px)` |
| `src/components/ui/select.tsx` | 修改 | SelectTrigger `px-3` → `px-(--field-px)` |
| `src/components/ui/textarea.tsx` | 修改 | `px-3` → `px-(--field-px)`（保留 `py-2`） |
| `src/components/pro/SearchField.tsx` | 修改 | 去掉 `px-2.5`，继承 InputGroup 的 `--field-px` |
| `src/routes/_auth/dev/theme-states.tsx` | 修改 | FieldGroup 补 SearchField 实例（进 theme-matrix 做确定性验证）；手抄 open 态 Select 演示块 `px-3` → `px-(--field-px)` 对齐 |
| `src/locales/en-US/common.json` | 修改 | 加 `dev.themeStates.fieldSearch` / `fieldSearchPlaceholder` |
| `src/locales/zh-CN/common.json` | 修改 | 同上（中文） |
| `src/components/ui/__tests__/field-density.test.ts` | 创建 | 文本守卫：field 组件消费 `--field-px`、无残留裸 `px-3`、SearchField 无 `px-2.5`；theme-states 含 `<SearchField` 且手抄块无 `border px-3` |

---

# Task 1：三份 design.md 回填 field 内距值表（值表先行）

**Files:**
- Modify: `docs/design/feishu.design.md`
- Modify: `docs/design/claude.design.md`
- Verify: `docs/design/shadcn.design.md`（已有，仅核对）

> 说明：PRD §7.5 实施纪律第一步是「design.md 值表回填」——值表没有的差异不进 token。本切片的 `--field-px` 分档值必须先在这里定稿。依据：feishu 高密度（12px，保持后台适配值）、claude 宽松纸面（16px，与其 `spacing.md=16` 对齐）、shadcn 中性（12px，其 `text-input.padding` 已是 `0 12px`）。

- [ ] **Step 1: feishu 回填 `padding: 0 12px`**

> 现码 `text-input` 用语义引用（`rounded/typography`）而非裸值，锚点取 `backgroundColor: "{colors.field-bg}"` 起整块（该 bg 全文唯一），在 `height: 36px` 后、`text-input-focused:` 前插入 padding。

Edit `docs/design/feishu.design.md`：
old_string:
```
    backgroundColor: "{colors.field-bg}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    height: 36px
  text-input-focused:
```
new_string:
```
    backgroundColor: "{colors.field-bg}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    height: 36px
    padding: 0 12px
  text-input-focused:
```

- [ ] **Step 2: claude 回填 `padding: 0 16px`**

> 锚点取 `backgroundColor: "{colors.surface}"` 起整块——含 `typography` + `height: 36px` + `text-input-focused:` 结尾的组合唯一（focused 块无 typography/height，不会误命中）。

Edit `docs/design/claude.design.md`：
old_string:
```
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    height: 36px
  text-input-focused:
```
new_string:
```
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    height: 36px
    padding: 0 16px
  text-input-focused:
```

- [ ] **Step 3: 核对 shadcn 已有 padding（不改）**

Run:
```bash
grep -n "padding: 0 12px" docs/design/shadcn.design.md
```
Expected: 命中 shadcn `text-input` 下的 `padding: 0 12px`（已存在，无需改动）。

- [ ] **Step 4: design:lint 确认静默通过**

Run:
```bash
pnpm design:lint
```
Expected: 通过（`padding` 是纯尺寸值、无新增低对比 bg+fg 配对，对比度棘轮不触发）。若报未登记 warning，**停下**——说明触发了非预期路径，回读 `scripts/design-md-lint.mjs:11-59` 白名单再判断，不要盲目加白名单。

- [ ] **Step 5: 提交**

```bash
git add docs/design/feishu.design.md docs/design/claude.design.md
git commit -m "docs(design): 回填 feishu/claude 输入框水平内距值表（field-px 依据）"
```

---

# Task 2：tokens.css 新增 `--field-px` + 分 flavor 覆盖 + snapshot 守护

**Files:**
- Modify: `src/styles/tokens.css`
- Test: `src/styles/__tests__/tokens.snapshot.test.ts`

- [ ] **Step 1: 写失败测试**

> ⚠️ 锚点校准（已核实现码）：`MUST_CONTAIN` 数组实际是 `const MUST_CONTAIN = [`（约 L51）至 `];`（约 L127），**数组内无 `--font-display` 行**、文件内**无 `圆角形态轴` test、无 `describe` 包裹**（是平铺 `test`）。故按下述语义定位，不要找旧计划里那些不存在的锚点。

在 `src/styles/__tests__/tokens.snapshot.test.ts` 的 `MUST_CONTAIN` 数组（`const MUST_CONTAIN = [` 到 `];` 之间）**任意位置追加一行**（数组元素顺序不影响 `toContain` 断言，建议放数组末尾 `'--radius-factor: 1.55;',` 之后）：
```ts
  '--field-px: calc(12px * var(--app-scale));',
```

并在 `test.each(MUST_CONTAIN)('token %s 与原型一致', ...)` 那一行之后追加一个新的平铺 test（字面量带分号防前缀碰撞）：
```ts
// field 水平内距分档（密度轴）：feishu/shadcn 紧凑 12px（:root 默认），claude 宽松 16px
test('field 水平内距分档：claude 覆盖为宽松档', () => {
  expect(css).toContain('--field-px: calc(12px * var(--app-scale));'); // :root 默认（feishu/shadcn）
  expect(css).toContain('--field-px: calc(16px * var(--app-scale));'); // claude 覆盖
});
```

- [ ] **Step 2: 运行确认失败**

Run: `./node_modules/.bin/vitest run src/styles/__tests__/tokens.snapshot.test.ts -t field`
Expected: FAIL —— `--field-px` 两条断言均 `toContain` 不到（token 尚未声明）。

- [ ] **Step 3: 写最小实现**

> ⚠️ 锚点唯一性（已核实）：裸 `--field-shadow: none;` 在 tokens.css 出现 **3 次**（:root / claude / shadcn），不能做 Edit 锚点。下述 old/new 已选唯一锚点：`:root` 用 `--field-bg: var(--surface-2);`（count=1），claude 用 `--field-ring-focus + --field-shadow` 两行组合（count=1）。

3a. `:root` 默认内距（feishu/shadcn 走此），old_string:
```
  --field-bg: var(--surface-2);
```
new_string:
```
  /* 输入框水平内距（密度轴）。feishu/shadcn 紧凑 12px，claude 在下方覆盖为宽松 16px。
     只随 --app-scale 缩放，随 flavor 换档；页面布局间距（--spacing）不动。 */
  --field-px: calc(12px * var(--app-scale));
  --field-bg: var(--surface-2);
```

3b. `[data-flavor='claude']` 覆盖为宽松档，old_string:
```
  --field-ring-focus: color-mix(in srgb, var(--pri) 15%, transparent);
  --field-shadow: none;
```
new_string:
```
  --field-ring-focus: color-mix(in srgb, var(--pri) 15%, transparent);
  --field-shadow: none;
  --field-px: calc(16px * var(--app-scale));
```

> 注意：`[data-flavor='shadcn']` 块**不加** `--field-px`——它继承 `:root` 的 12px（与 shadcn.design.md 的 `padding: 0 12px` 一致）。

- [ ] **Step 4: 运行确认通过**

Run: `./node_modules/.bin/vitest run src/styles/__tests__/tokens.snapshot.test.ts`
Expected: PASS（含新增 field 分档 test 与 `MUST_CONTAIN` 的 `--field-px` 断言，原有断言不退化）。

- [ ] **Step 5: 提交**

```bash
git add src/styles/tokens.css src/styles/__tests__/tokens.snapshot.test.ts
git commit -m "feat(tokens): 新增 --field-px 输入框内距密度 token（claude 宽松 16px）"
```

---

# Task 3：field 组件消费 `--field-px`（统一 px-3 / 去除 px-2.5 不一致）

**Files:**
- Test: `src/components/ui/__tests__/field-density.test.ts`（创建）
- Modify: `src/components/ui/input.tsx`
- Modify: `src/components/ui/native-select.tsx`
- Modify: `src/components/ui/select.tsx`
- Modify: `src/components/ui/textarea.tsx`
- Modify: `src/components/pro/SearchField.tsx`

> 落法说明：项目已用 Tailwind v4 变量简写（length-var 先例见 `dropdown-menu.tsx` 的 `max-h-(--radix-dropdown-menu-content-available-height)`），`px-(--field-px)` 同族语法，展开为 `padding-inline: var(--field-px)`。文本守卫（读源码断言）与项目现有 `theme-guards`/`tokens.snapshot` 的「读文件文本断言」哲学一致，避免 Radix SelectTrigger 单独 render 的 context 复杂度。

- [ ] **Step 1: 写失败测试**

Create `src/components/ui/__tests__/field-density.test.ts`:
```ts
import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';

// field 组件水平内距必须消费 --field-px（密度轴），不得回退硬编码 px-3 / px-2.5。
// 读源码文本断言，与 theme-guards / tokens.snapshot 的确定性守卫同哲学。
const FIELD_FILES = [
  'src/components/ui/input.tsx',
  'src/components/ui/native-select.tsx',
  'src/components/ui/select.tsx',
  'src/components/ui/textarea.tsx',
];

describe('field 密度：水平内距走 --field-px', () => {
  test.each(FIELD_FILES)('%s 消费 --field-px', (file) => {
    const src = readFileSync(file, 'utf8');
    expect(src).toContain('px-(--field-px)');
  });

  // 强断言：field 文件内不得残留任何裸 px-3（含 InputGroupAddon 的 `border-r px-3`）。
  // 旧写法 not.toContain('border px-3') 抓不到 `border-r px-3`（中间是 -r），会放行 addon；
  // 改用正则精确匹配裸 px-3，负向前瞻 (?![\d.]) 避免误伤 px-3.5 之类（当前 field 文件无此变体）。
  test.each(FIELD_FILES)('%s 无残留硬编码 px-3', (file) => {
    const src = readFileSync(file, 'utf8');
    expect(src).not.toMatch(/px-3(?![\d.])/);
  });

  test('SearchField 去除 px-2.5，改由 InputGroup 的 --field-px 提供内距', () => {
    const src = readFileSync('src/components/pro/SearchField.tsx', 'utf8');
    expect(src).not.toContain('px-2.5');
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `./node_modules/.bin/vitest run src/components/ui/__tests__/field-density.test.ts`
Expected: FAIL —— 组件尚含裸 `px-3` / `px-2.5`，`px-(--field-px)` 缺失。

- [ ] **Step 3: 改 input.tsx（3 处，含 InputGroupAddon）**

> ⚠️ old_string 已按现码逐字校准：transition 是四值版 `transition-[border-color,box-shadow,background,color]`；InputGroup 含 `w-full min-w-0 overflow-hidden`；InputGroupAddon 是固定 `border-r px-3`（**无 align 三元、无 border-l**）。只替换 `px-3` 一个 token，其余原样保留。

3a. `inputVariants` 首行，old_string:
```
    'ui-field w-full min-w-0 rounded-md border px-3 outline-none transition-[border-color,box-shadow,background,color]',
```
new_string:
```
    'ui-field w-full min-w-0 rounded-md border px-(--field-px) outline-none transition-[border-color,box-shadow,background,color]',
```

3b. `InputGroup` className 首行，old_string:
```
        'ui-field flex w-full min-w-0 items-center gap-2 overflow-hidden rounded-md border px-3 transition-[border-color,box-shadow,background,color]',
```
new_string:
```
        'ui-field flex w-full min-w-0 items-center gap-2 overflow-hidden rounded-md border px-(--field-px) transition-[border-color,box-shadow,background,color]',
```

3c. `InputGroupAddon` className，old_string:
```
        'inline-flex self-stretch items-center border-r px-3',
```
new_string:
```
        'inline-flex self-stretch items-center border-r px-(--field-px)',
```

- [ ] **Step 4: 改 native-select.tsx**

`nativeSelectVariants` 首行，old_string:
```
    'ui-field w-full min-w-0 cursor-pointer rounded-md border px-3 text-sm outline-none transition-[border-color,box-shadow,background,color]',
```
new_string:
```
    'ui-field w-full min-w-0 cursor-pointer rounded-md border px-(--field-px) text-sm outline-none transition-[border-color,box-shadow,background,color]',
```

- [ ] **Step 5: 改 select.tsx**

> 现码 SelectTrigger 含 `w-full min-w-0 cursor-pointer`，transition 顺序是 `[background,border-color,color,box-shadow]`（与 input 略不同），缩进 10 空格。

`SelectTrigger` className 首行，old_string:
```
          'ui-field flex w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-md border px-3 text-sm outline-none transition-[background,border-color,color,box-shadow]',
```
new_string:
```
          'ui-field flex w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-md border px-(--field-px) text-sm outline-none transition-[background,border-color,color,box-shadow]',
```

- [ ] **Step 6: 改 textarea.tsx（保留 py-2）**

> 现码缩进 10 空格，transition 顺序 `[background,border-color,box-shadow,color]`；只换 `px-3`，`py-2` 原样保留。

textarea className 首行，old_string:
```
          'ui-field flex min-h-[calc(88px*var(--app-scale))] w-full rounded-md border px-3 py-2 text-sm outline-none transition-[background,border-color,box-shadow,color]',
```
new_string:
```
          'ui-field flex min-h-[calc(88px*var(--app-scale))] w-full rounded-md border px-(--field-px) py-2 text-sm outline-none transition-[background,border-color,box-shadow,color]',
```

- [ ] **Step 7: 改 SearchField.tsx（去掉 px-2.5）**

> ⚠️ 现码 SearchField 是多行 `<InputGroup inputSize="sm" className={cn(...containerClassName)}>`（**无 `size` prop、无 `className` 变量**，旧计划的单行 old_string 是虚构的）。px-2.5 在 className 数组首行，缩进 8 空格，只删这一处即可，InputGroup 自身的 `px-(--field-px)` 会接管内距。
>
> **这是有意的密度变更，非纯清理**：SearchField 内距 10px → 12px(feishu/shadcn) / 16px(claude)，**是本切片唯一影响 feishu/shadcn 的改动**（其余控件 12px 与旧 px-3 逐像素等价、feishu/shadcn 零变化）。必须纳入 Task 4 视觉抽查。

SearchField className 数组首行，old_string:
```
        'h-[calc(34px*var(--app-scale))] px-2.5',
```
new_string:
```
        'h-[calc(34px*var(--app-scale))]',
```

- [ ] **Step 8: 运行确认通过**

Run: `./node_modules/.bin/vitest run src/components/ui/__tests__/field-density.test.ts`
Expected: PASS（全部 field 文件含 `px-(--field-px)`、无残留裸 `px-3`（含 InputGroupAddon）；SearchField 无 `px-2.5`）。

- [ ] **Step 9: 类型 + lint + 引用完整性守卫**

Run:
```bash
./node_modules/.bin/tsc -b --noEmit
./node_modules/.bin/eslint src/components/ui/input.tsx src/components/ui/native-select.tsx src/components/ui/select.tsx src/components/ui/textarea.tsx src/components/pro/SearchField.tsx
./node_modules/.bin/vitest run src/styles/__tests__/theme-guards.test.ts
```
Expected: 均无报错。theme-guards Test 1（引用完整性）PASS —— `--field-px` 已在 Task 2 声明，组件 `px-(--field-px)` 引用合法。

- [ ] **Step 10: 提交**

```bash
git add src/components/ui/input.tsx src/components/ui/native-select.tsx src/components/ui/select.tsx src/components/ui/textarea.tsx src/components/pro/SearchField.tsx src/components/ui/__tests__/field-density.test.ts
git commit -m "feat(ui): field 组件水平内距改走 --field-px 密度 token（统一 px-3、去除 px-2.5）"
```

---

# Task 3.5：SearchField 接入 theme-states 状态矩阵（合规 + 最强验证）

**Files:**
- Test: `src/components/ui/__tests__/field-density.test.ts`（追加 theme-states 断言）
- Modify: `src/locales/en-US/common.json`、`src/locales/zh-CN/common.json`
- Modify: `src/routes/_auth/dev/theme-states.tsx`

> **为什么有这个 Task**：SearchField 是本切片改造的 Pro 组件，且是唯一影响真实业务页面所有 flavor 的改动。CLAUDE.md 硬纪律：改造 Pro 组件必须同步 `/dev/theme-states` 矩阵，「没有状态矩阵的 token 化不算完成」。实读 theme-states 的 FieldGroup 已含 Input / Input+addon / NativeSelect / Select / Textarea（都已进 theme-matrix 截图），**独缺 SearchField**——本 Task 补齐，让它进 18 格确定性截图，取代原先最弱、可被跳过的手动验证。同页另有一段手抄的 Select「open 态」演示块（复制了 SelectTrigger 的 class，含裸 `px-3`），一并对齐，避免改造后同一验收页面内距漂移。

- [ ] **Step 1: 写失败断言（往 field-density.test.ts 的 describe 块追加）**

在 SearchField 那个 test 之后追加：
```ts
  // SearchField 是改造的 Pro 组件，必须进 theme-states 矩阵做确定性截图（CLAUDE.md 纪律）
  test('theme-states 矩阵含 SearchField 实例', () => {
    const src = readFileSync('src/routes/_auth/dev/theme-states.tsx', 'utf8');
    expect(src).toContain('<SearchField');
  });

  // 手抄的 open 态 Select 演示块复制了 SelectTrigger 的 class，须随 --field-px 对齐，
  // 否则改造后与真实 SelectTrigger 在同一验收页面内距不一致。
  test('theme-states 手抄 open 态 Select 不残留 border px-3', () => {
    const src = readFileSync('src/routes/_auth/dev/theme-states.tsx', 'utf8');
    expect(src).not.toContain('border px-3');
  });
```

- [ ] **Step 2: 运行确认失败**

Run: `./node_modules/.bin/vitest run --exclude '.claude/**' src/components/ui/__tests__/field-density.test.ts`
Expected: 新增两条 FAIL（theme-states 尚无 `<SearchField`、手抄块仍含 `border px-3`）。

- [ ] **Step 3: 加 i18n key（en + zh，key 顺序与现有 field* 一致）**

3a. Edit `src/locales/en-US/common.json`，old_string:
```
      "fieldTextarea": "Textarea",
      "fieldTextareaPlaceholder": "Enter notes",
```
new_string:
```
      "fieldTextarea": "Textarea",
      "fieldTextareaPlaceholder": "Enter notes",
      "fieldSearch": "Search field",
      "fieldSearchPlaceholder": "Search",
```

3b. Edit `src/locales/zh-CN/common.json`，old_string:
```
      "fieldTextarea": "多行文本",
      "fieldTextareaPlaceholder": "请输入备注",
```
new_string:
```
      "fieldTextarea": "多行文本",
      "fieldTextareaPlaceholder": "请输入备注",
      "fieldSearch": "搜索框",
      "fieldSearchPlaceholder": "搜索",
```

- [ ] **Step 4: theme-states import SearchField**

Edit `src/routes/_auth/dev/theme-states.tsx`，old_string:
```
import { Pagination } from '@/components/pro/Pagination';
```
new_string:
```
import { Pagination } from '@/components/pro/Pagination';
import { SearchField } from '@/components/pro/SearchField';
```

- [ ] **Step 5: FieldGroup 补 SearchField 实例（插在 Select 与 Textarea 之间）**

Edit，old_string:
```
              onValueChange={() => undefined}
            />
          </Field>

          <Field className="md:col-span-2">
            <FieldLabel htmlFor="theme-field-textarea">{t('dev.themeStates.fieldTextarea')}</FieldLabel>
```
new_string:
```
              onValueChange={() => undefined}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="theme-field-search">{t('dev.themeStates.fieldSearch')}</FieldLabel>
            <SearchField id="theme-field-search" placeholder={t('dev.themeStates.fieldSearchPlaceholder')} />
          </Field>

          <Field className="md:col-span-2">
            <FieldLabel htmlFor="theme-field-textarea">{t('dev.themeStates.fieldTextarea')}</FieldLabel>
```

- [ ] **Step 6: 对齐手抄 open 态 Select 演示块（px-3 → px-(--field-px)）**

Edit，old_string:
```
                className="ui-field flex h-[var(--control-md)] w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-md border px-3 text-sm outline-none"
```
new_string:
```
                className="ui-field flex h-[var(--control-md)] w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-md border px-(--field-px) text-sm outline-none"
```

- [ ] **Step 7: 类型 + 测试确认通过**

Run:
```bash
./node_modules/.bin/tsc -b --noEmit
./node_modules/.bin/vitest run --exclude '.claude/**' src/components/ui/__tests__/field-density.test.ts src/styles/__tests__/tokens.snapshot.test.ts
```
Expected: 全 PASS（`<SearchField` 已在 theme-states、手抄块无 `border px-3`；tsc 无缺 i18n key/类型报错；tokens.snapshot 的 themeStatesSource 存在性断言不因新增内容退化）。若仓库有 i18n key 一致性守卫，一并跑确认 en/zh 对齐。

- [ ] **Step 8: 提交**

```bash
git add src/locales/en-US/common.json src/locales/zh-CN/common.json src/routes/_auth/dev/theme-states.tsx src/components/ui/__tests__/field-density.test.ts
git commit -m "feat(dev): SearchField 接入 theme-states 密度矩阵 + 对齐手抄 Select 演示块"
```

---

# Task 4：矩阵验收（视觉档差 + 全量守卫）

**Files:** 无代码改动，纯验收（theme-states 的组件改动已在 Task 3.5 完成）。`/dev/theme-states` 的 FieldGroup 现含 Input / Input+addon / NativeSelect / Select / Textarea / SearchField 全套 field 组件，`--field-px` 分档后 18 格 theme-matrix 自动体现**所有被改 field 组件**的内距档差——全部确定性截图覆盖，无手动兜底缺口。

- [ ] **Step 1: 全量守卫与测试**

Run:
```bash
./node_modules/.bin/tsc -b --noEmit
./node_modules/.bin/eslint src
./node_modules/.bin/vitest run --exclude '.claude/**'
pnpm theme:guard   # 跑前确认无 .claude/worktrees 残留，否则 vitest 子串过滤会污染结果
```
Expected: 全绿。`theme:guard` 三文件均通过（引用完整性含 `--field-px`；snapshot 含新断言与 themeStatesSource 不退化；模块边界不涉及）。

- [ ] **Step 2: 实跑 18 格矩阵采集（e2e，必须真跑）**

> 依赖 `agent-browser` CLI。若环境无该 CLI，明确记录「未实跑」+ 原因到任务文档，不得宣称完成。

Run:
```bash
pnpm visual:matrix
```
Expected: `test-results/m0-visual/theme-matrix/` 下重新生成 18 张 `{flavor}-{mode}-{scale}.png`；过程无 `horizontal overflow` 抛错；输入框内距在三风格间呈现档差。

- [ ] **Step 3: 抽查截图辅助确认 field 内距档差（辅助证据，非唯一凭据）**

> 覆盖面（已核实现码）：theme-matrix 截的是 `/dev/theme-states` 页面，其 FieldGroup 含 Input / Input+addon(`https://`) / NativeSelect / Select / Textarea / SearchField（Task 3.5 补入）——**所有被改的 field 组件都在这 18 格里**，无一遗漏。
>
> ⚠️ 证据定位：`--field-px` 每侧差 4px（claude 16 vs 其它 12），单个 Input 总宽差 8px，占整页 1440px 截图约 0.5%，用 Read 看压缩 PNG **大概率肉眼分不出**。**真正的确定性证据是 `field-density.test.ts` + `tokens.snapshot.test.ts` + `assertNoHorizontalOverflow` 三层自动化断言**（Step 1 已跑绿）。本步截图为辅助抽查，捕捉「整体没崩 / 无溢出 / 无跳档」这类结构性问题，不作为「档差是否达标」的唯一凭据。

用 Read 工具打开对比（文件名以 Step 2 实跑产物为准）：
- `test-results/m0-visual/theme-matrix/claude-light-md.png`（field 内距更宽，16px）
- `test-results/m0-visual/theme-matrix/feishu-light-md.png` / `shadcn-light-md.png`（紧凑，12px）

抽查确认（结构性，非像素级）：三档 scale 下内距随 `--app-scale` 等比变化、无横向溢出、无跳档；claude 下 field 留白可见地大于 feishu/shadcn。若需像素级确证，可选加一步 `getComputedStyle` 读实际 `padding-inline` 值断言（比人眼可靠且省事）。

- [ ] **Step 3b（可选补充）: SearchField 在真实业务页面的集成布局抽查**

> SearchField 已随 Task 3.5 进 theme-matrix，主验证是确定性的。本步是**可选**的集成层补充：确认内距 10px→12/16px 后，在真实工具栏/侧栏容器里不撑破布局。对抗验证已确认（border-box + 外部固定宽容器）不会溢出；最紧实例是 `RolePermissionEditor` 的 200px 固定宽搜索框（claude 下文字可视宽约收窄 7%，不破坏布局但值得看一眼）。

若做，用 agent-browser 手动截图，**覆盖受影响最大的两处**（不要只截 `/admin/users`）：
```bash
# 登录 → 依次切 feishu / claude → 各截一张：
#   /admin/users  （DeptTree 撑满侧栏搜索）
#   /admin/roles  （RolePermissionEditor 的 200px 固定宽搜索框——最紧场景，重点看）
# 关注：SearchField 左右留白随 flavor 变化 + 整行无溢出 / 无换行错位
```
Expected：两 flavor 下布局均无溢出、无换行错位。**此步可选**（主验证已由 theme-matrix + field-density 覆盖）；环境无 agent-browser 时可跳过并记录，不阻断完成判定。

- [ ] **Step 4: 确认未碰全局 `--spacing` 与 Card/Table（范围纪律自检）**

Run:
```bash
git diff --stat main -- src/styles/global.css
grep -rn "\-\-card\|\-\-table-cell" src/styles/tokens.css
```
Expected: `global.css` **无改动**（`--spacing` 未动，符合 PRD 红线）；`grep` **无命中**（本切片不引入 card/table 密度 token，范围收敛正确）。

---

## Self-Review（作者自检，已执行）

**1. Spec 覆盖：**
- PRD §7.5「密度/间距维度」的 field 子集 → Task 1-4 ✅。Card/table 明确剥离并在裁剪说明记录理由（非遗漏）。
- PRD §7.5 实施纪律「design.md 值表回填 → tokens.css → theme-states 矩阵 → snapshot/guard」四步 → Task 1（值表）/ Task 2（token+snapshot）/ Task 3（组件消费）/ Task 4（矩阵+guard）✅。
- PRD §7.5 红线「严禁分叉全局 --spacing」→ Task 4 Step 4 显式自检 ✅。

**2. 占位符扫描：** 无 TBD/TODO；每个改代码步骤含完整 old/new_string 或完整代码块与精确命令。

**3. 类型/命名一致性：** `--field-px` 在 tokens.css 声明、snapshot 断言、组件 `px-(--field-px)`、field-density 测试四处逐字一致；值 `calc(12px * var(--app-scale))`（默认）/ `calc(16px * var(--app-scale))`（claude）跨 Task 1 值表、Task 2 token、Task 4 抽查一致。

**4. 风险点已在计划内消解：**
- 声明/消费顺序（theme-guards Test 1）：Task 2 先声明、Task 3 后消费，不可倒（Step 9 显式验证）。
- shadcn 不写 `--field-px`：靠继承 `:root` 12px，与 design.md 一致（Task 2 Step 3 注明）。
- `px-(--field-px)` Tailwind v4 语法：真实同族先例是 `dropdown-menu.tsx` 的 `max-h-(--radix-dropdown-menu-content-available-height)`（length-var 简写），由 Task 4 Step 2 `visual:matrix` e2e 实跑最终证成（旧计划所引 `text-(--field-placeholder)` 先例经核实不存在，已删）。
- SearchField 去 `px-2.5` 后由 InputGroup 提供内距：InputGroup 已改走 `--field-px`（Task 3 Step 3b）。

**已知遗留（不在本切片范围，记录待后续）：**
- `shadcn.design.md` 的 `table-row` 条目重复两次——既存文件小 bug，随 table 密度切片一并清理。
- Card / table 密度 → 后续切片（见裁剪说明 1、2）。

---

## 对抗性校订记录（2026-07-07 开工前，对抗性 review 后重写）

初版计划的「可执行载荷层」是对着**重构前的旧码**写的，与当前源码逐条不符。经对抗性核验（`content.includes(oldString)`，与 Edit 工具同逻辑 + 忽略缩进二次比对）已全部订正：

| 项 | 初版问题 | 现状 |
| --- | --- | --- |
| Task 1 feishu/claude old_string | 用虚构的 `borderRadius/fontSize/button-primary` 锚点（现码是 `rounded/typography/text-input-focused`） | 已按现码 `backgroundColor` 起整块重写 |
| Task 3 五组件 old_string（9 处） | transition 全是旧的两值版 `transition-[color,box-shadow]`；InputGroup 漏 `w-full min-w-0 overflow-hidden`；SelectTrigger 漏 `w-full min-w-0 cursor-pointer`；InputGroupAddon 虚构 `align` 三元；SearchField 虚构 `size` prop | 已逐字对齐现码（四值 transition、真实类、`inputSize`/`containerClassName`） |
| Task 2 snapshot 锚点 | 引用不存在的 `--font-display` 行 / `圆角形态轴` test / `describe` 块 / L7-19 行号 | 改为「MUST_CONTAIN 数组内任意位置追加」+「`test.each` 后新增平铺 test」 |
| field-density 护栏 | `not.toContain('border px-3')` 抓不到 InputGroupAddon 的 `border-r px-3` | 改为 `not.toMatch(/px-3(?![\d.])/)` 强断言 |
| SearchField 验收 | 号称纳入 matrix 抽查，但 SearchField 不在 theme-states 矩阵 | 新增 Step 3b 真实页面（/admin/users）验证 |

**执行者开工前自检（强制）**：本计划所有 `old_string` 均按 `HEAD` 现码校准。若开工时源码又有变动，先用 `node -e "console.log(require('fs').readFileSync(FILE,'utf8').includes(OLD))"` 逐条复验为 `true` 再执行 Edit；任一为 `false` 立即停下重取现码，不要盲目 Edit 或放宽匹配（放宽匹配会误删 `w-full min-w-0 overflow-hidden` 等真实类）。

### 第二轮：三路对抗 agent（worktree 真执行 / 测试守卫 / 设计纪律）后增补

- **worktree e2e 实证**：在隔离副本里严格照本计划执行 Task 1-3，9 处组件 Edit + 4 处其它全部一次匹配成功、TDD 红绿态吻合、`tsc`+全量 `vitest 344/344`+`eslint`+`theme:guard 126/126` 全绿、`--spacing` 零改动。原计划「可执行且执行后全绿」已被实测证成（注：Task 3.5 是第二轮新增，未纳入该次 worktree 跑，需执行时补验）。
- **新增 Task 3.5**（对抗发现）：`theme-states` FieldGroup 已含 Input/addon/NativeSelect/Select/Textarea（全在 theme-matrix），独缺 SearchField；SearchField 又是全切片唯一影响真实业务页面所有 flavor 的改动，原被路由到最弱的手动验证。故补 SearchField 进矩阵（CLAUDE.md 纪律），并对齐同页手抄 Select 演示块的 `px-3`。
- **护栏洞已堵**：`field-density.test.ts` 从 `not.toContain('border px-3')` 改 `not.toMatch(/px-3(?![\d.])/)`（原写法抓不到 InputGroupAddon 的 `border-r px-3`）。
- **验收措辞校准**：Task 4 Step 3 从「肉眼明显大于」降级为「辅助抽查」——8px 差占整页 0.5%，确定性证据是三层自动化断言，非人眼看压缩 PNG。
- **执行环境防御**：`vitest run <路径>` 是子串过滤，并发 `.claude/worktrees` 会污染结果；命令统一加 `--exclude '.claude/**'` 或开工前清理 worktree。
- **对抗确认站得住（真实构建/实测验证，无需改）**：`--field-px` 无双重缩放（`padding-inline` 直接消费不经 `--spacing`）；`pl-0` 与 `px-(--field-px)` 级联不破坏（`pl-0` 特异性更高且不同元素）；SearchField/addon 不撑破布局（border-box + 固定宽容器）；theme-guards baseline 对 padding 天然免疫；design:lint 实测 exit 0；无遗漏 field 组件；三 flavor 覆盖完整。

---

## 执行交接

**计划已保存到 `docs/superpowers/plans/2026-07-07-design-density-field.md`。两种执行方式：**

1. **Subagent-Driven（推荐）** — 每个 Task 派新 subagent 执行，Task 间两阶段 review，迭代快。
2. **Inline Execution** — 本会话内按 executing-plans 批量执行，设检查点 review。

**选哪种？**
