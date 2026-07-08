# Style Profile 文件化（tokens.css 拆分）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把单一 `src/styles/tokens.css` 拆成 `tokens.base.css` + `tokens.{feishu,claude,shadcn}.css`，让"加一套风格 = 加一个文件"，为 S5（sera 第四风格）铺路——**纯结构搬运，视觉零变化**。

**Architecture:** 按"共享骨架 vs per-flavor 增量"拆分。共享层（flavor 无关的巨型 `:root` 组件族默认、通用暗色、radius/scale 档、`:root` 颜色兜底）进 `tokens.base.css`；每套 flavor 的颜色块 + 覆盖块 + radius-factor 默认进各自文件。`global.css` 的单行 `@import './tokens.css'` 换成 4 行有序 import（base 必须最先）。两个硬编码 `tokens.css` 路径的守卫（snapshot + theme-guards）同步改数据来源，断言逻辑一律不动。

**Tech Stack:** Vite + Tailwind CSS v4（`@import` 内联合并）+ Vitest(jsdom，读 CSS 文本断言) + agent-browser CLI（视觉 diff，可选）。

**来源方案:** 本轮路线图 S1（PRD `2026-07-07-shadcn-create-inspired-design-system-prd.md` §6.6 第 1 条「Style profile 文件化」）。

## Global Constraints

- **视觉零变化是本计划的验收红线。** 拆分是纯搬运；任何 token 值、声明顺序、选择器的改动都是 bug，不是"顺手优化"。
- **`@import` 顺序硬约束：`tokens.base.css` 必须排在三个 flavor 文件之前。** 巨型 `:root` 组件族默认与 `[data-flavor='claude']` / `[data-flavor='shadcn']` 覆盖块**同特异性 (0,1,0)**，靠 CSS 源顺序决胜。base 后置会让 flavor 覆盖被默认盖掉 → 切风格失效。
- **feishu light = `:root` 默认（选项 Z）。** 当前 `:root, [data-flavor='feishu'][data-mode='light']` 合并选择器块整体留在 base，**不**在 `tokens.feishu.css` 里重复一份 feishu light 颜色（避免双写 drift）。feishu 文件只承载它相对默认的增量：dark 颜色 + radius-factor。这是默认 flavor 的合理不对称，不影响 claude/shadcn/sera 的自包含性。
- **不动 `global.css` 的 `@theme inline` / `@layer` / `:root` 缩放块**——本计划只改它的第 3 行 `@import`。
- **不动 localStorage key、FOUC 脚本、appearance store 结构、任何 `.tsx` 组件。**
- **守卫断言内容零改动**——只改"读哪些文件"，不改"断言什么"。

---

## 文件结构

| 文件 | 动作 | 职责 |
| --- | --- | --- |
| `src/styles/tokens.base.css` | 创建 | flavor 无关共享层：`:root` 颜色兜底(=feishu light) + 巨型 `:root` 组件族默认 + `[data-mode='dark']` 通用暗色 + radius 档 + scale 档 |
| `src/styles/tokens.feishu.css` | 创建 | feishu 增量：`[data-flavor='feishu'][data-mode='dark']` + feishu radius-factor 默认 |
| `src/styles/tokens.claude.css` | 创建 | claude 自包含：light/dark 颜色块 + `[data-flavor='claude']` 覆盖块 + dark 微调 + radius-factor 默认 |
| `src/styles/tokens.shadcn.css` | 创建 | shadcn 自包含：light/dark 颜色块 + `[data-flavor='shadcn']` 覆盖块 + dark 微调 + radius-factor 默认 |
| `src/styles/tokens.css` | 删除 | 内容全部迁出后删除 |
| `src/styles/global.css` | 修改 L3 | 单行 import → 4 行有序 import（base 最先） |
| `src/styles/__tests__/tokens.snapshot.test.ts` | 修改 L4 + 末尾新增 | `css` 来源改为 4 文件拼接读取（`MUST_CONTAIN` 不动）；末尾加 import 顺序守卫 |
| `src/styles/__tests__/theme-guards.test.ts` | 修改 L7 | `tokenDeclarationFiles` 加入 4 个新文件 |

### tokens.css → 目标文件 搬运地图（按选择器块，逐字搬运不改值）

| 现 tokens.css 位置 | 选择器块 | 去向 |
| --- | --- | --- |
| L1-3 | 文件头注释 | 重写为 base 头注释（见 Task 2） |
| L4-10 | `:root, [data-flavor='feishu'][data-mode='light']` | **base** |
| L11-16 | `[data-flavor='feishu'][data-mode='dark']` | feishu |
| L17-23 | `[data-flavor='claude'][data-mode='light']` | claude |
| L24-31 | `[data-flavor='claude'][data-mode='dark']` | claude |
| L32-37 | `[data-flavor='shadcn'][data-mode='light']` | shadcn |
| L38-44 | `[data-flavor='shadcn'][data-mode='dark']` | shadcn |
| L46-254 | 巨型 `:root`（组件族默认，含 `--radius-factor: 1`、圆角公式、阴影） | **base** |
| L255-261 | `[data-mode='dark']`（通用暗色覆盖） | **base** |
| L262-282 | `[data-flavor='claude']`（组件族覆盖） | claude |
| L283-287 | `[data-flavor='claude'][data-mode='dark']`（微调） | claude |
| L288-308 | `[data-flavor='shadcn']`（组件族覆盖） | shadcn |
| L309-313 | `[data-flavor='shadcn'][data-mode='dark']`（微调） | shadcn |
| L314 | `html:not([data-radius])[data-flavor='feishu'] { --radius-factor: 0.75; }` | feishu |
| L315 | `html:not([data-radius])[data-flavor='claude'] { --radius-factor: 1; }` | claude |
| L316 | `html:not([data-radius])[data-flavor='shadcn'] { --radius-factor: 1.25; }` | shadcn |
| L317-318 | `[data-radius='sharp']` / `[data-radius='round']` | **base** |
| L320-328 | app-scale 注释 + `:root { --app-scale: 1; }` + `[data-zoom='sm']` / `[data-zoom='lg']` | **base** |

> **base 内块顺序（重要）：** 颜色兜底块(L4-10) → 巨型 `:root`(L46-254) → `[data-mode='dark']`(L255-261) → radius 档(L317-318) → scale 档(L320-328)。保持与原文件相对顺序一致，`[data-mode='dark']` 必须在巨型 `:root` 之后（它覆盖 `--fill-hover` 等默认）。

---

## Task 1：前置检查 + 拆分前"零变化"基准采集

**Files:**
- 无代码改动；产出临时基准文件到 scratchpad

**Interfaces:**
- Produces: `<scratch>/tokens-before.txt`（拆分前 build CSS 的 CSS 自定义属性多重集，Task 2 的对照基准）

- [ ] **Step 1: 切特性分支**

Run:
```bash
git rev-parse --abbrev-ref HEAD
git switch -c feat/style-profile-split
```
Expected: 当前在 `main`；新分支 `feat/style-profile-split` 创建并切换成功。

- [ ] **Step 2: 确认基线全绿**

Run:
```bash
./node_modules/.bin/vitest run src/styles/__tests__/tokens.snapshot.test.ts src/styles/__tests__/theme-guards.test.ts
```
Expected: 全部 PASS（把已有失败排除在本次改动之外）。

- [ ] **Step 3: 采集拆分前 CSS 自定义属性多重集基准**

> 原理：Vite 把所有 `@import` 内联合并进最终 dist CSS。拆分是纯搬运，最终 CSS 里 `--name:value` 声明的**多重集**（含重复、忽略顺序与空格）必须完全不变。这是确定性证据之一。

Run:
```bash
./node_modules/.bin/tsc -b --noEmit && ./node_modules/.bin/vite build >/dev/null 2>&1
SCRATCH="/private/tmp/claude-501/-Users-ocean-Documents--------/d4b27027-0c55-47d7-833b-41a970623dcb/scratchpad"
cat dist/assets/*.css | grep -oE '\--[A-Za-z0-9_-]+:[^;{}]*' | tr -d ' ' | sort > "$SCRATCH/tokens-before.txt"
wc -l "$SCRATCH/tokens-before.txt"
```
Expected: build 成功；`tokens-before.txt` 生成且行数 > 0（记下行数，Task 2 比对）。

- [ ] **Step 4:（可选）采集拆分前视觉 baseline**

> 依赖 `agent-browser` CLI。若不可用，跳过并在 Task 2 Step 8 明确记录"视觉 diff 未实跑，仅多重集 + 顺序核对"。

Run:
```bash
pnpm visual:matrix && cp -r test-results/m0-visual/theme-matrix "$SCRATCH/theme-matrix-before" 2>/dev/null && echo "baseline saved" || echo "SKIP: agent-browser 不可用"
```
Expected: 打印 `baseline saved`（18 张 PNG 已另存）或 `SKIP: ...`。

---

## Task 2：原子拆分（4 新文件 + 删 tokens.css + 改 import + 改两守卫路径）

> **这是一次原子重构**——拆到一半会出现 token 双重定义或引用悬空，测试必红。整个 Task 一口气做完再验。

**Files:**
- Create: `src/styles/tokens.base.css`
- Create: `src/styles/tokens.feishu.css`
- Create: `src/styles/tokens.claude.css`
- Create: `src/styles/tokens.shadcn.css`
- Delete: `src/styles/tokens.css`
- Modify: `src/styles/global.css:3`
- Modify: `src/styles/__tests__/tokens.snapshot.test.ts:4`
- Modify: `src/styles/__tests__/theme-guards.test.ts:7`

**Interfaces:**
- Consumes: `<scratch>/tokens-before.txt`（Task 1）
- Produces: 4 个 `tokens.*.css`；`global.css` 有序 import

- [ ] **Step 1: 建 `tokens.base.css`**

先 `Read src/styles/tokens.css`（确认当前行号，编辑会漂移）。新建 `src/styles/tokens.base.css`，头部写下面注释，随后**逐字**粘入搬运地图中标 **base** 的块，顺序为：颜色兜底块 → 巨型 `:root` → `[data-mode='dark']` → radius 档 → scale 档。

文件头注释（替换原 L1-3）：
```css
/* src/styles/tokens.base.css —— flavor 无关的共享 token 骨架。
   权威源：spec v4.1 §10.2b + docs/design/*.design.md。
   本文件含：:root 颜色兜底(=feishu light，FOUC 兜底) + 组件族默认 + 通用暗色 + radius/scale 档。
   per-flavor 增量在 tokens.{feishu,claude,shadcn}.css。
   ⚠️ global.css 中本文件必须最先 @import：巨型 :root 与 [data-flavor=xxx] 同特异性，靠源顺序决胜。 */
```

- [ ] **Step 2: 建 `tokens.feishu.css`**

新建 `src/styles/tokens.feishu.css`，逐字粘入搬运地图中标 **feishu** 的块（L11-16 dark 颜色块 + L314 radius-factor），头部加：
```css
/* src/styles/tokens.feishu.css —— feishu 相对 base 默认的增量（dark 颜色 + radius-factor）。
   feishu light = base 的 :root 默认，不在此重复（选项 Z）。 */
```

- [ ] **Step 3: 建 `tokens.claude.css`**

新建 `src/styles/tokens.claude.css`，逐字粘入标 **claude** 的块，顺序：light 颜色(L17-23) → dark 颜色(L24-31) → `[data-flavor='claude']` 覆盖块(L262-282) → dark 微调(L283-287) → radius-factor(L315)，头部加：
```css
/* src/styles/tokens.claude.css —— claude 风格自包含 profile（颜色 + 组件族覆盖 + radius-factor）。 */
```

- [ ] **Step 4: 建 `tokens.shadcn.css`**

新建 `src/styles/tokens.shadcn.css`，逐字粘入标 **shadcn** 的块，顺序：light 颜色(L32-37) → dark 颜色(L38-44) → `[data-flavor='shadcn']` 覆盖块(L288-308) → dark 微调(L309-313) → radius-factor(L316)，头部加：
```css
/* src/styles/tokens.shadcn.css —— shadcn 风格自包含 profile（颜色 + 组件族覆盖 + radius-factor）。 */
```

- [ ] **Step 5: 删除 `tokens.css`**

Run:
```bash
git rm src/styles/tokens.css
```
Expected: `tokens.css` 从工作区与索引移除。

- [ ] **Step 6: 改 `global.css` 的 import（L3）**

把 `src/styles/global.css` 第 3 行：
```css
@import './tokens.css';
```
替换为（**base 最先，顺序不可乱**）：
```css
@import './tokens.base.css';
@import './tokens.feishu.css';
@import './tokens.claude.css';
@import './tokens.shadcn.css';
```

- [ ] **Step 7: 改两个守卫的文件来源**

7a. `src/styles/__tests__/tokens.snapshot.test.ts` 第 4 行：
```ts
const css = readFileSync('src/styles/tokens.css', 'utf8');
```
替换为：
```ts
// tokens.css 已拆分为 base + 三 flavor profile（S1）。拼接后断言不变——MUST_CONTAIN 逐值校验一律照旧。
const css = ['tokens.base.css', 'tokens.feishu.css', 'tokens.claude.css', 'tokens.shadcn.css']
  .map((f) => readFileSync(`src/styles/${f}`, 'utf8'))
  .join('\n');
```

7b. `src/styles/__tests__/theme-guards.test.ts` 第 7 行：
```ts
const tokenDeclarationFiles = ['src/styles/tokens.css', 'src/styles/global.css'];
```
替换为：
```ts
const tokenDeclarationFiles = [
  'src/styles/tokens.base.css',
  'src/styles/tokens.feishu.css',
  'src/styles/tokens.claude.css',
  'src/styles/tokens.shadcn.css',
  'src/styles/global.css',
];
```

7c. 在 `src/styles/__tests__/tokens.snapshot.test.ts` **末尾**新增 import 顺序守卫（2026-07-08 调研结论：巨型 `:root` 与 `[data-flavor=*]` 覆盖块同特异性 (0,1,0)，靠源顺序决胜；顺序错**不报错、只视觉漂移**，多重集对比也抓不到，必须测试钉死。`globalCss` 变量该文件 L5 已有，直接用）：
```ts
test('global.css 必须最先 @import tokens.base.css（flavor 覆盖与 base 默认同特异性，靠源顺序决胜）', () => {
  const imports = [...globalCss.matchAll(/@import '\.\/(tokens\.[a-z]+\.css)';/g)].map((m) => m[1]);
  expect(imports).toEqual(['tokens.base.css', 'tokens.feishu.css', 'tokens.claude.css', 'tokens.shadcn.css']);
});
```

- [ ] **Step 8: 验证——三层"零变化"证据**

Run（① 全测试绿：token 声明无丢失 + var 引用全部有定义）:
```bash
./node_modules/.bin/tsc -b --noEmit
./node_modules/.bin/eslint src/styles
./node_modules/.bin/vitest run src/styles/__tests__/tokens.snapshot.test.ts src/styles/__tests__/theme-guards.test.ts
```
Expected: 全 PASS。若 snapshot 报缺某值 → 某块搬漏/搬错；若 theme-guards「var 引用必须有定义」报 missing → `tokenDeclarationFiles` 没更全或块搬漏。

Run（② build CSS 多重集与拆分前逐字节一致）:
```bash
./node_modules/.bin/vite build >/dev/null 2>&1
SCRATCH="/private/tmp/claude-501/-Users-ocean-Documents--------/d4b27027-0c55-47d7-833b-41a970623dcb/scratchpad"
cat dist/assets/*.css | grep -oE '\--[A-Za-z0-9_-]+:[^;{}]*' | tr -d ' ' | sort > "$SCRATCH/tokens-after.txt"
diff "$SCRATCH/tokens-before.txt" "$SCRATCH/tokens-after.txt" && echo "ZERO-DIFF: 声明多重集一致"
```
Expected: 打印 `ZERO-DIFF`；`diff` 无输出。有 diff → 搬运改了值或漏了声明。

> ③ 层叠顺序守卫：Step 7c 的 import 顺序测试已把「base 必须最先」从人工核对升级为自动守卫（多重集证不了层叠顺序，这条测试补上盲区）。上面 ① 跑 snapshot 测试时应看到它 PASS。

- [ ] **Step 9:（可选）视觉 diff 增强验证**

> 仅当 Task 1 Step 4 采到了 baseline。

Run:
```bash
pnpm visual:matrix
SCRATCH="/private/tmp/claude-501/-Users-ocean-Documents--------/d4b27027-0c55-47d7-833b-41a970623dcb/scratchpad"
for f in "$SCRATCH"/theme-matrix-before/*.png; do
  b=$(basename "$f")
  cmp -s "$f" "test-results/m0-visual/theme-matrix/$b" && echo "same: $b" || echo "DIFF: $b"
done
```
Expected: 全部 `same:`（18 格逐字节一致）。任何 `DIFF:` → 用 Read 打开对比该格，定位是层叠顺序错还是搬运错。若 Task 1 跳过了 baseline，此步记录"视觉 diff 未实跑（agent-browser 不可用），零变化依据 = ①全测试绿 + ②build 多重集零 diff + ③import 顺序核对"。

- [ ] **Step 10: 提交**

```bash
git add src/styles/ src/styles/__tests__/tokens.snapshot.test.ts src/styles/__tests__/theme-guards.test.ts
git commit -m "refactor(tokens): tokens.css 拆分为 base + 三 flavor profile（加风格=加文件，视觉零变化）"
```

---

## Task 3：全量守卫收尾

**Files:** 无改动，仅验证。

- [ ] **Step 1: 跑齐 CLAUDE.md「完成前必跑」全套**

Run:
```bash
./node_modules/.bin/tsc -b --noEmit
./node_modules/.bin/eslint src
./node_modules/.bin/vitest run
pnpm theme:guard
```
Expected: 全绿。`theme:guard`（= tokens.snapshot + theme-guards + module-boundaries）不退化。

- [ ] **Step 2: 确认无残留 tokens.css 引用**

Run:
```bash
grep -rnE "styles/tokens\.css" src/ scripts/ e2e/ 2>/dev/null | grep -vE "tokens\.(base|feishu|claude|shadcn)\.css" || echo "无残留 tokens.css 路径引用"
```
Expected: 打印「无残留...」。注意 `global.css` 内注释里"见 tokens.css"这类文字不影响构建，可忽略；但若是 `@import` 或 `readFileSync` 命中则必须处理。

- [ ] **Step 3: 确认视觉 token 改动为零、只有结构变化**

Run:
```bash
git diff --stat main -- src/styles/
```
Expected: 显示 tokens.css 删除、4 个 tokens.*.css 新增、global.css 小改；行数增删应基本相抵（搬运）。

---

## Self-Review（作者自检，已执行）

**1. 方案覆盖：** S1 = PRD §6.6-1「style profile 文件化」+「snapshot 守卫同步重构」。搬运地图覆盖 tokens.css 全 328 行（L1-3 注释重写、L4-328 全部块有去向，L45/L319 空行忽略）→ Task 2 Step 1-4；snapshot 守卫重构 → Step 7a；额外发现的 theme-guards 第二守卫 → Step 7b。✅

**2. 占位符扫描：** 无 TBD/TODO。搬运用"选择器块 + 行区间 + 逐字粘入"的精确指令而非重贴 328 行——对纯搬运，重贴反增抄错风险，行区间 + 唯一选择器锚点是更安全的确定性指令，非占位符。守卫改动贴了完整前后代码。

**3. 类型/命名一致性：** 4 个文件名 `tokens.{base,feishu,claude,shadcn}.css` 在文件结构表、搬运地图、Step 1-4、global.css import、两个守卫数组、grep 校验中全程一致。`<scratch>` 路径在 Task 1 Step 3/4 与 Task 2 Step 8/9 一致。

**4. 风险消解：**
- 层叠顺序（唯一硬约束）→ Global Constraints 强调 + Step 7c 自动守卫测试钉死（2026-07-08 调研后从人工核对升级）。
- feishu 双写 drift → 选项 Z（Step 2 明确 feishu light 不重复）。
- 守卫连坐（两个而非一个路径依赖）→ Step 7a/7b 都改。
- "多重集证不了层叠顺序" → Step 8 三层证据（全测试 + build 多重集 + 顺序核对 + 可选视觉 diff）如实分层，不夸大。
- agent-browser 不可用 → Step 4/9 显式 fallback 与"未实跑"记录（G1 诚实）。

---

## S1.5 备忘：cascade layers 迁移（可选后续切片，不在本计划范围）

2026-07-08 调研结论（一手来源：Tailwind 官方 [#16109](https://github.com/tailwindlabs/tailwindcss/discussions/16109)、[Panda CSS cascade-layers](https://panda-css.com/docs/concepts/cascade-layers)、[MUI css-layers](https://mui.com/material-ui/customization/css-layers/)）：`@layer tokens-base, tokens-flavors;` + `@import './tokens.*.css' layer(...)` 可把「base 必须最先 import」从**源顺序约定**升级为**机制保证**——层序先于特异性评估、由首次声明定死，import 顺序随便乱都不坏；Tailwind v4 管线原生支持该写法（团队成员亲荐），浏览器门槛低于 v4 自身。

**S1 刻意不做**：layers 是层叠机制变更（token 从未分层降为分层，与全部未分层样式的优先级关系反转），与本计划「纯搬运零变化」红线冲突——一次只改一个变量，出视觉回归才能归因。待 S1 落定、baseline diff 护栏在手后可作为独立切片实施。届时唯一审计点：确认无未分层样式声明与 token 文件同名的变量（初查：global.css 未分层块只有 `--spacing/--text-*/--container-*`，与 token 文件无交集；html inline 注入的 `--pri` 是 inline style，永远最高，不受影响）。自定义层声明须放在 `@import 'tailwindcss'` **之后**，使其排在 utilities 层后、高于 Tailwind 全部层。

---

## 执行交接

计划已保存到 `docs/superpowers/plans/2026-07-08-style-profile-split.md`。两种执行方式：

1. **Subagent-Driven（推荐）** — 每 Task 派新 subagent，Task 间两阶段 review。
2. **Inline Execution** — 本会话内 executing-plans 批量执行，设检查点 review。
