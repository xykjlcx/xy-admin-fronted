# Table 族 per-flavor 密度 token 实施计划（Phase 2b 第二切片 / playbook 复用）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给三套风格（feishu/shadcn/claude）的后台表格做「按 flavor 分档」的行高与内距——新增 `--table-row-h`/`--table-header-h` 组件族几何 token、把 cell 水平内距链到既有 `--field-px`，让 `ui/table` / `pro/TableShell` / `DataTable` 三处**从各自硬编码几何（h-11/h-14/px-2/px-3/py-[10px]/py-[12.5px]）统一到同一组 token**，兑现「飞书紧凑 44 vs claude 宽松 48」的密度差异，同时消灭「两套表格几何自相矛盾」这个真矛盾。

**Architecture:** 在 `tokens.css` 的 `:root`（feishu 默认）声明 `--table-cell-px: var(--field-px)`（链单一真相源，自动继承 12/12/16 分档）、`--table-row-h: 44px`、`--table-header-h: 48px`；`[data-flavor='claude']` 覆盖 `--table-row-h: 48px`（宽松档，表头继承 48）；`[data-flavor='shadcn']` 覆盖 `--table-header-h: 44px`（源码线，行高继承 44）。三处表格组件把硬编码几何换成 `h-(--table-header-h)`/`h-(--table-row-h)`/`px-(--table-cell-px)`；ui 线的数据行从「td 靠 py 撑高」统一为「td 固定行高 + align-middle」，与 pro 线的固定行高机制对齐。**绝不碰全局 `--spacing`**（PRD §7.5 红线）；**不动字号**（表头 13px 保持，字号阶梯是独立维度另成切片）。

**Tech Stack:** Vite + React + TypeScript + Tailwind CSS v4 + TanStack Table + Vitest(jsdom) + agent-browser CLI。

**来源 PRD / 实测:** `docs/superpowers/specs/2026-07-07-shadcn-create-inspired-design-system-prd.md` §7.5（Phase 2b 密度维度）+ `docs/日志/0708-table密度实测-chrome136绕过与飞书数据钉死.md`（飞书 admin 真机实测钉死的三档值表）。

## Global Constraints

- **严禁分叉全局 `--spacing`**（PRD §7.5 红线：全局分叉引发业务页布局漂移）。本切片只新增 `--table-*` 几何 token。
- **不动字号**：`ui/table` 表头 `text-[calc(13px*var(--app-scale))]`、`TableShell` 表头同值——**原样保留**。字号阶梯是 Phase 2b 独立维度，不混进本切片。
- **cell 水平内距链 `--field-px`**：`--table-cell-px: var(--field-px)`，不重复写 12/12/16 数值（单一真相源，claude 自动跟随 16）。
- **Tailwind v4 变量简写**：`px-(--table-cell-px)` / `h-(--table-row-h)` / `h-(--table-header-h)`。length-var 简写先例：field-px 切片已证成 `px-(--field-px)`，`h-(--x)` 同族（展开为 `height: var(--x)`）。
- **vitest 位置参数是子串过滤**：所有 `vitest run <路径>` 步骤统一加 `--exclude '.claude/**'`，或先 `ls .claude/worktrees` 确认无并发 worktree 残留（防同名测试副本污染，field-px 切片实测复现过）。
- **三档值表**（真相源，跨全计划逐字一致）：

  | token | :root（feishu） | claude 覆盖 | shadcn 覆盖 | 据 |
  | --- | --- | --- | --- | --- |
  | `--table-cell-px` | `var(--field-px)`（=12px） | 靠 field-px（=16px） | 靠 field-px（=12px） | 复用 field-px，claude 有 spacing.md 据 |
  | `--table-row-h` | `calc(44px * var(--app-scale))` | `calc(48px * var(--app-scale))` | 继承 :root（44） | feishu 实测44 / shadcn 源码44 / claude +4 宽松 |
  | `--table-header-h` | `calc(48px * var(--app-scale))` | 继承 :root（48） | `calc(44px * var(--app-scale))` | feishu 实测48 vs shadcn 源码44（实测真差） |

---

## 作者裁剪说明（执行者必读，勿盲抄）

三处组件 recon（2026-07-08，对 HEAD 现码逐字校准）后收窄范围，**属刻意为之**：

1. **只做行高 + cell 水平内距，不做字号/垂直 padding 语义外的东西。** 表头 13px 字号原样保留（实测飞书表头 14px，但字号是独立维度，混进来会稀释切片纯度、撞 PRD §10 过度抽象）。数据行垂直内距由「固定行高 + align-middle/items-center」承担，不再单独设 `py`。
2. **ui 线数据行机制统一为「固定行高」。** 现码 `ui/table` 的 `TableCell` 靠 `py-[calc(10px*var(--app-scale))]` 撑高（无固定行高），`DataTable` 又用 `bodyCellClassName = py-[calc(12.5px*var(--app-scale))]` 覆盖成更高。本切片把 td 改为 `h-(--table-row-h)` + `align-middle`（已有），去掉 py 撑高，与 `pro/TableShell` 的 `h-14` 固定行高机制**统一到同一 token**。**这是本切片的核心价值**——消灭两套几何矛盾，不是单纯加 flavor 差。**注意两套机制并非完全等价**（worktree 对抗验证指出）：`ui/table` 的 `<td>` 用 `h-(--x)` 是 `min-height` 语义（内容超高→行撑高、不裁切，已实测撑到 102px `child_clipped:false`）；`TableShell` 的 grid `<div>` 是硬高度 + 父级 `overflow-hidden`（内容超高→裁切）。仅当行内容 ≤ 行高时两者视觉等价——当前所有实例满足（最高 MenuTreeTable 两行 ≈36px < 44px）；未来任何 >44px 的 TableShell 行会静默裁切，需警觉。
3. **视觉影响须知（非 bug，是预期收敛）**：`DataTable`/`TableShell` 现有列表页数据行从 ~55/56px **收紧到 44px（feishu/shadcn）**，对齐飞书实测基准；claude 下 48px。`ui/table` 从 py 撑的 ~40px 增到固定 44px。这是「统一到实测值」的刻意结果，Task 5 视觉抽查须确认无塌陷/无溢出。
4. **不新建 dataset、不动 store、不改 `--spacing`、不改 FOUC。** 纯 token 新增 + 组件 className 替换 + 一处现有测试断言更新。
5. **Card 密度仍不做**（全仓库无 Card 组件、无挂点，随 Phase 3 组件收敛做，见 field-px 计划裁剪说明 1）。

---

## 护栏配合结论（recon 已核实，执行时照此，勿临时试）

| 护栏 | 对本切片的反应 | 要做的 |
| --- | --- | --- |
| `theme:guard` 引用完整性（`theme-guards.test.ts` Test 1） | 组件里 `h-(--table-row-h)` 等会被抓为对 token 的引用，**必须先在 tokens.css 声明否则红** | Task 2 先声明，Task 3/4 再消费（顺序不可倒） |
| `theme:guard` 颜色禁令（Test 2/3/4） | height/padding 类**天然免疫**（禁令针对颜色/边框/ring 类） | 零改动 |
| `tokens.snapshot.test.ts`（`MUST_CONTAIN` 加法式白名单） | 新 token 不被动变红；要守护需主动加断言 | Task 2 往 `MUST_CONTAIN` 加 3 条 + 加分档 test |
| `data-table.test.tsx:169` `toHaveClass('px-3')` | **会红**——px-3 改成 `px-(--table-cell-px)` 后断言失配 | Task 3 同步更新为 `px-(--table-cell-px)` |
| `table-primitives.test.tsx` | 只断言**颜色 token** + `ui-table-row`（不测几何），**安全** | 零改动（已核实全文无 h-11/h-14/px-2/px-3 断言） |
| `design:lint`（schema 键校验，`@google/design.md`） | **只认标准键**（height/padding/typography/颜色）；臆造 `rowHeight`/`cellPaddingX` 会 `exit 1`（worktree 实测坐实，非对比度问题） | Task 1 只用 `height`+`padding`；Step 4 **必跑**确认，不凭推断放行 |

---

## 前置检查

- [ ] **确认分支并切出特性分支**（当前在 `main`，不直接在主干开发）

Run:
```bash
git rev-parse --abbrev-ref HEAD
git switch -c feat/design-density-table
```
Expected: 新分支 `feat/design-density-table` 创建并切换成功。

> ⚠️ **基线必须含 field-px 切片**（main 已合，5 个 commit）：本计划全程依赖 `--field-px`（`--table-cell-px: var(--field-px)` + Task 2 Step 3b claude 锚点）。`grep -c "field-px" src/styles/tokens.css` 必须 ≥ 1。若改用隔离 worktree 执行，确保 worktree 基于 `main` 而非更早提交（worktree 对抗验证踩过：起点落后 5 commit → field-px 缺失 → 计划 100% 跑不通，`git merge --ff-only main` 后才跑通）。

- [ ] **确认基线绿 + 现码逐字校验**（field-px 血泪教训：old_string 必须对现码为真）

Run:
```bash
ls .claude/worktrees 2>/dev/null && echo "⚠️ 有 worktree 残留，vitest 步骤务必加 --exclude '.claude/**'" || echo "无 worktree 残留"
./node_modules/.bin/vitest run --exclude '.claude/**' \
  src/styles/__tests__/tokens.snapshot.test.ts \
  src/styles/__tests__/theme-guards.test.ts \
  src/components/pro/__tests__/data-table.test.tsx \
  src/components/pro/__tests__/table-primitives.test.tsx
node -e "const f=require('fs');const c=f.readFileSync('src/components/ui/table.tsx','utf8');console.log('ui TableHead h-11 px-3:', c.includes('h-11 px-3 text-left align-middle'));console.log('ui TableCell px-3 py-10:', c.includes('px-3 py-[calc(10px*var(--app-scale))] align-middle whitespace-nowrap'));"
node -e "const f=require('fs');const c=f.readFileSync('src/components/pro/DataTable.tsx','utf8');console.log('DataTable bodyCellClassName py-12.5:', c.includes(\"const bodyCellClassName = 'py-[calc(12.5px*var(--app-scale))]';\"));"
node -e "const f=require('fs');const c=f.readFileSync('src/components/pro/TableShell.tsx','utf8');console.log('Shell header h-11 px-2:', c.includes('grid h-11 items-center bg-(--table-header-bg) px-2'));console.log('Shell row h-14 px-2:', c.includes('ui-table-row grid h-14 items-center border-t border-(--table-border) px-2'));"
```
Expected: 4 个测试文件全 PASS；5 个 `includes` 全打印 `true`（若任一 `false`，源码已变动，停下重取现码，不要盲目 Edit）。

---

## 文件结构

| 文件 | 动作 | 职责 |
| --- | --- | --- |
| `docs/design/feishu.design.md` | 修改 | `table-header` 补 height 48；Layout 段「≈40px 待补采」更新为实测 44/48/12 |
| `docs/design/shadcn.design.md` | 修改 | `table-header` 补 height 44；补 table-row 44 / cell padding 12 |
| `docs/design/claude.design.md` | 修改 | 新增 `table-header`（height 48）+ `table-row`（height 48）+ cell padding 16 条目 |
| `src/styles/tokens.css` | 修改 | `:root` 加 `--table-cell-px`/`--table-row-h`/`--table-header-h`；claude/shadcn 覆盖 |
| `src/styles/__tests__/tokens.snapshot.test.ts` | 修改 | `MUST_CONTAIN` 加 3 条 + 新增 table 分档 test |
| `src/components/ui/table.tsx` | 修改 | TableHead `h-11 px-3`→token；TableCell `px-3 py-[10px]`→`h-(--table-row-h) px-(--table-cell-px)` |
| `src/components/pro/DataTable.tsx` | 修改 | 删 `bodyCellClassName` 的 py 撑高（行高改由 TableCell 的固定行高统一控制） |
| `src/components/pro/__tests__/data-table.test.tsx` | 修改 | L169 `toHaveClass('px-3')`→`toHaveClass('px-(--table-cell-px)')` |
| `src/components/pro/TableShell.tsx` | 修改 | Header/Row/LoadingRows 的 `h-11`/`h-14`/`px-2`→token |
| `src/components/pro/__tests__/table-density.test.ts` | 创建 | 文本守卫：三处组件消费 table 几何 token；无残留裸 h-11/h-14/px-2/px-3/py-[10px]/py-[12.5px] |

---

# Task 1：三份 design.md 回填 table 密度值表（值表先行）

**Files:**
- Modify: `docs/design/feishu.design.md`
- Modify: `docs/design/shadcn.design.md`
- Modify: `docs/design/claude.design.md`

> PRD §7.5 实施纪律第一步是「design.md 值表回填」——值表没有的差异不进 token。本切片三档值先在此定稿：feishu 表头48/行44/px12（真机实测）、shadcn 表头44/行44/px12（源码线）、claude 表头48/行48/px16（行高宽松外推 + padding 走 spacing.md=16）。

- [ ] **Step 1: feishu 补 table-header height + 更新 Layout 补采 TODO**

> 现码 `feishu.design.md` L102-105 `table-header` 只有颜色；L154 Layout 段写「表格行高目标 ≈40px…完整密度值待 Step 7 补采定稿」。补采已完成（0708 实测），据此更新。

1a. Edit `docs/design/feishu.design.md`，table-header 补 height。old_string:
```
  table-header:
    backgroundColor: transparent
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
  sidebar:
```
new_string:
```
  table-header:
    backgroundColor: transparent
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    height: 48px
    padding: 0 12px
  sidebar:
```

1b. Edit `docs/design/feishu.design.md`，更新 Layout 补采 TODO。old_string:
```
表格行高目标 ≈40px（管理后台适配值；飞书真身更紧至 ≈28-32px，完整密度值待 Step 7 补采定稿）。
```
new_string:
```
表格实测（2026-07-08 admin.feishu.cn 真机 computed style）：表头行 48px、数据行 44px、单元格水平内距 12px、字号 14px、行分隔 1px hairline。旧「≈40px / 真身 28-32」估值作废，以实测为准。
```

- [ ] **Step 2: shadcn 补 table-header height + row/padding**

> 现码 `shadcn.design.md` L92-95 `table-header` 只有颜色。补几何（源码线 new-york：表头 h-11=44、行 h-11=44、px-3=12）。

Edit `docs/design/shadcn.design.md`，old_string:
```
  table-header:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.muted}"
    typography: "{typography.caption}"
---
```
new_string:
```
  table-header:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.muted}"
    typography: "{typography.caption}"
    height: 44px
    padding: 0 12px
---
```

- [ ] **Step 3: claude 新增 table 条目（原无，据 spacing.md 派生）**

> 现码 `claude.design.md` **无 table 条目**（claude 无后台表格产品，console 未登录已核实）。据 claude 宽松语言：cell padding 走 spacing.md=16（与 field-px claude=16 同源）、行高 48（比 feishu/shadcn 44 宽松一档）、表头 48。锚点用 `badge-pill` 整块（L134-139，全文唯一）后插入。

Edit `docs/design/claude.design.md`，old_string:
```
  badge-pill:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: 4px 12px
---
```
new_string:
```
  badge-pill:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: 4px 12px
  table-header:
    typography: "{typography.caption}"
    height: 48px
    padding: 0 16px
---
```

- [ ] **Step 4: design:lint 必跑确认（不凭推断放行 —— 对抗验证在此揪出过硬阻断）**

Run:
```bash
pnpm design:lint
```
Expected: **exit 0**。table-header 只用 schema（`@google/design.md`）认的键：`height`（表头高）+ `padding`（cell 水平内距，与 text-input 同族）+ `typography`/颜色。**绝不用 `rowHeight`/`cellPaddingX` 等自定义子 token**——worktree 对抗验证实测坐实：这类键 schema 不认，直接 `exit 1`（数据行高的真相源在 tokens.css 的 `--table-row-h`，不进 design.md 结构化字段）。若报 `未知键` warning，说明还有 schema 外的键，**停下删键**，不要扩 lint 白名单（白名单是对比度豁免用的，与 schema 违规不同类）。

- [ ] **Step 5: 提交**

```bash
git add docs/design/feishu.design.md docs/design/shadcn.design.md docs/design/claude.design.md
git commit -m "docs(design): 回填 table 密度值表（feishu 实测 48/44/12、shadcn 44/44/12、claude 48/48/16）"
```

---

# Task 2：tokens.css 新增 table 几何 token + 分 flavor 覆盖 + snapshot 守护

**Files:**
- Modify: `src/styles/tokens.css`
- Test: `src/styles/__tests__/tokens.snapshot.test.ts`

- [ ] **Step 1: 写失败测试**

> 现码 `tokens.snapshot.test.ts`：`MUST_CONTAIN` 数组 `const MUST_CONTAIN = [`（约 L51）到 `];`（约 L127），末尾元素是 `'--field-px: calc(12px * var(--app-scale));',`（L127）；`test.each(MUST_CONTAIN)` 在 L129；field 分档 test 在 L132。

1a. 在 `MUST_CONTAIN` 数组末尾（`'--field-px: calc(12px * var(--app-scale));',` 之后）追加三行：
```ts
  '--table-cell-px: var(--field-px);',
  '--table-row-h: calc(44px * var(--app-scale));',
  '--table-header-h: calc(48px * var(--app-scale));',
```

1b. 在 field 分档 test（`test('field 水平内距分档：claude 覆盖为宽松档', ...)`）那个 test 块之后，追加一个新的平铺 test：
```ts
// table 密度分档（几何轴）：cell 内距链 field-px；行高 feishu/shadcn 44、claude 48；表头 feishu/claude 48、shadcn 44
test('table 密度分档：claude 行高宽松、shadcn 表头收紧', () => {
  expect(css).toContain('--table-cell-px: var(--field-px);');           // cell 内距链 field-px 单一真相源
  expect(css).toContain('--table-row-h: calc(44px * var(--app-scale));');   // :root 数据行 44（feishu/shadcn）
  expect(css).toContain('--table-header-h: calc(48px * var(--app-scale));'); // :root 表头 48（feishu/claude）
  expect(css).toContain('--table-row-h: calc(48px * var(--app-scale));');    // claude 覆盖：数据行 48
  expect(css).toContain('--table-header-h: calc(44px * var(--app-scale));'); // shadcn 覆盖：表头 44
});
```

- [ ] **Step 2: 运行确认失败**

Run: `./node_modules/.bin/vitest run --exclude '.claude/**' src/styles/__tests__/tokens.snapshot.test.ts -t table`
Expected: FAIL —— table 分档断言 `toContain` 不到（token 尚未声明）。

- [ ] **Step 3: 写最小实现**

> 锚点唯一性（已核实现码）：`:root` 的 table 颜色 token 区块以 `--table-action-fg: var(--pri);`（L169，count=1）结尾；claude 覆盖块 `[data-flavor='claude'] {`（L256，与 field-px claude 覆盖 L268 同块）；shadcn 覆盖块 `[data-flavor='shadcn'] {`（L281）。

3a. `:root` 新增 table 几何 token（接在颜色 token 区块后），old_string:
```
  --table-action-fg: var(--pri);
```
new_string:
```
  --table-action-fg: var(--pri);
  /* 表格几何（密度轴）。cell 水平内距链 --field-px 单一真相源（feishu/shadcn 12、claude 16）；
     行高 feishu/shadcn 44，claude 在下方覆盖为宽松 48；表头 feishu/claude 48，shadcn 覆盖为 44。
     只随 --app-scale 缩放，随 flavor 换档；页面布局间距（--spacing）不动。 */
  --table-cell-px: var(--field-px);
  --table-row-h: calc(44px * var(--app-scale));
  --table-header-h: calc(48px * var(--app-scale));
```

3b. `[data-flavor='claude']` 覆盖数据行为宽松档，old_string（复用 field-px claude 覆盖那两行组合作唯一锚点）:
```
  --field-ring-focus: color-mix(in srgb, var(--pri) 15%, transparent);
  --field-shadow: none;
  --field-px: calc(16px * var(--app-scale));
```
new_string:
```
  --field-ring-focus: color-mix(in srgb, var(--pri) 15%, transparent);
  --field-shadow: none;
  --field-px: calc(16px * var(--app-scale));
  --table-row-h: calc(48px * var(--app-scale));
```

> 注意：claude **不覆盖** `--table-header-h`（继承 :root 的 48，与 claude table-header height 48 一致）；`--table-cell-px` 靠 `var(--field-px)` 自动变 16，无需在此重复。

3c. `[data-flavor='shadcn']` 覆盖表头为 44。**锚点已由 worktree 对抗验证实测确定**——用 `--option-check: var(--text);`（`grep -Fc` = 1，唯一，在 shadcn light 块内，介于选择器与 dark 块之间）。⚠️ **绝不**用 `[data-flavor='shadcn'] {` 起始行作锚点：它文件内出现 2 次（L281 目标块 + L308 `html:not([data-radius])[data-flavor='shadcn']` 子串），会撞车（worktree 实测坐实）。

old_string:
```
  --option-check: var(--text);
```
new_string:
```
  --option-check: var(--text);
  --table-header-h: calc(44px * var(--app-scale));
```
> 执行前 `node -e "console.log(require('fs').readFileSync('src/styles/tokens.css','utf8').split('--option-check: var(--text);').length-1)"` 确认 == 1。shadcn **不覆盖** `--table-row-h`（继承 :root 44）；`--table-cell-px` 靠 field-px 自动 12。

> shadcn **不覆盖** `--table-row-h`（继承 :root 的 44）；`--table-cell-px` 靠 field-px 自动 12。

- [ ] **Step 4: 运行确认通过**

Run: `./node_modules/.bin/vitest run --exclude '.claude/**' src/styles/__tests__/tokens.snapshot.test.ts`
Expected: PASS（含新增 table 分档 test 与 `MUST_CONTAIN` 三条断言，原有断言不退化）。

- [ ] **Step 5: 提交**

```bash
git add src/styles/tokens.css src/styles/__tests__/tokens.snapshot.test.ts
git commit -m "feat(tokens): 新增 --table-row-h/--table-header-h/--table-cell-px 密度 token（claude 行48、shadcn 表头44）"
```

---

# Task 3：ui 线消费 token（ui/table + DataTable，机制统一为固定行高）

**Files:**
- Test: `src/components/pro/__tests__/table-density.test.ts`（创建）
- Modify: `src/components/ui/table.tsx`
- Modify: `src/components/pro/DataTable.tsx`
- Modify: `src/components/pro/__tests__/data-table.test.tsx`

> 落法：ui/table 数据行从「td 靠 py 撑高」改为「td 固定 `h-(--table-row-h)` + `align-middle`（已有）」，去掉 py；DataTable 删 `bodyCellClassName` 的 py 撑高（行高统一由 TableCell 的固定行高控制）。文本守卫（读源码断言）与项目 `theme-guards`/`tokens.snapshot` 同哲学。

- [ ] **Step 1: 写失败测试（建 table-density.test.ts，先只放 ui 线断言）**

Create `src/components/pro/__tests__/table-density.test.ts`:
```ts
import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';

// 表格几何必须消费 --table-* 密度 token，不得回退硬编码 h-11/h-14/px-2/px-3/py-[Npx]。
// 读源码文本断言，与 theme-guards / tokens.snapshot 的确定性守卫同哲学。
describe('table 密度：行高与内距走 --table-* token', () => {
  test('ui/table.tsx 消费 --table-header-h / --table-row-h / --table-cell-px', () => {
    const src = readFileSync('src/components/ui/table.tsx', 'utf8');
    expect(src).toContain('h-(--table-header-h)');
    expect(src).toContain('h-(--table-row-h)');
    expect(src).toContain('px-(--table-cell-px)');
  });

  test('ui/table.tsx 无残留硬编码 h-11 / px-3 / py-[..px]', () => {
    const src = readFileSync('src/components/ui/table.tsx', 'utf8');
    expect(src).not.toMatch(/\bh-11\b/);
    expect(src).not.toMatch(/px-3(?![\d.])/);
    expect(src).not.toMatch(/py-\[calc\(10px/);
  });

  test('DataTable.tsx 无残留 py-[12.5px] 撑高（行高改由固定行高统一）', () => {
    const src = readFileSync('src/components/pro/DataTable.tsx', 'utf8');
    expect(src).not.toMatch(/py-\[calc\(12\.5px/);
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `./node_modules/.bin/vitest run --exclude '.claude/**' src/components/pro/__tests__/table-density.test.ts`
Expected: FAIL —— ui/table 尚含 h-11/px-3/py-[10px]、DataTable 含 py-[12.5px]，token 引用缺失。

- [ ] **Step 3: 改 ui/table.tsx（TableHead + TableCell）**

3a. `TableHead` className，old_string:
```
        'h-11 px-3 text-left align-middle text-[calc(13px*var(--app-scale))] font-medium whitespace-nowrap text-(--table-header-fg)',
```
new_string:
```
        'h-(--table-header-h) px-(--table-cell-px) text-left align-middle text-[calc(13px*var(--app-scale))] font-medium whitespace-nowrap text-(--table-header-fg)',
```

3b. `TableCell` className（去 py 撑高，改固定行高），old_string:
```
        'px-3 py-[calc(10px*var(--app-scale))] align-middle whitespace-nowrap',
```
new_string:
```
        'h-(--table-row-h) px-(--table-cell-px) align-middle whitespace-nowrap',
```

- [ ] **Step 4: 改 DataTable.tsx（删 bodyCellClassName 的 py 撑高）**

> 现码 L62 `const bodyCellClassName = 'py-[calc(12.5px*var(--app-scale))]';`，L200 `className={cn(alignClass(cell.column.columnDef.meta?.align), bodyCellClassName)}`。行高统一交给 TableCell 的 `h-(--table-row-h)`，DataTable 不再叠加 py。

4a. 删除 `bodyCellClassName` 声明，old_string:
```
const bodyCellClassName = 'py-[calc(12.5px*var(--app-scale))]';
const emptyRowSelection: RowSelectionState = {};
```
new_string:
```
const emptyRowSelection: RowSelectionState = {};
```

4b. L200 cell className 去掉 `bodyCellClassName`，old_string:
```
                          className={cn(alignClass(cell.column.columnDef.meta?.align), bodyCellClassName)}
```
new_string:
```
                          className={alignClass(cell.column.columnDef.meta?.align)}
```

- [ ] **Step 5: 更新会红的 data-table.test.tsx L169 断言**

> 现码 L169 `expect(firstNameCell).toHaveClass('px-3');` —— cell 内距改 token 后 px-3 失配。

Edit `src/components/pro/__tests__/data-table.test.tsx`，old_string:
```
  expect(firstNameCell).toHaveClass('px-3');
```
new_string:
```
  expect(firstNameCell).toHaveClass('px-(--table-cell-px)');
```

- [ ] **Step 6: 运行确认通过**

Run:
```bash
./node_modules/.bin/vitest run --exclude '.claude/**' \
  src/components/pro/__tests__/table-density.test.ts \
  src/components/pro/__tests__/data-table.test.tsx
```
Expected: PASS（table-density 的 ui 线断言全绿；data-table 的 px-(--table-cell-px) 断言绿）。

- [ ] **Step 7: 类型 + lint + 引用完整性守卫**

Run:
```bash
./node_modules/.bin/tsc -b --noEmit
./node_modules/.bin/eslint src/components/ui/table.tsx src/components/pro/DataTable.tsx
./node_modules/.bin/vitest run --exclude '.claude/**' src/styles/__tests__/theme-guards.test.ts
```
Expected: 均无报错。theme-guards Test 1 PASS —— `--table-header-h`/`--table-row-h`/`--table-cell-px` 已在 Task 2 声明，组件引用合法。（注意确认 DataTable 删 bodyCellClassName 后无未使用变量 TS 报错。）

- [ ] **Step 8: 提交**

```bash
git add src/components/ui/table.tsx src/components/pro/DataTable.tsx src/components/pro/__tests__/table-density.test.ts src/components/pro/__tests__/data-table.test.tsx
git commit -m "feat(ui): ui/table + DataTable 行高/内距走 --table-* token，数据行统一为固定行高"
```

---

# Task 4：pro/TableShell 消费 token（三处几何统一）

**Files:**
- Test: `src/components/pro/__tests__/table-density.test.ts`（追加 pro 线断言）
- Modify: `src/components/pro/TableShell.tsx`

- [ ] **Step 1: 追加失败断言（往 table-density.test.ts 的 describe 块追加）**

在 DataTable 那个 test 之后追加：
```ts
  test('TableShell.tsx 消费 --table-header-h / --table-row-h / --table-cell-px', () => {
    const src = readFileSync('src/components/pro/TableShell.tsx', 'utf8');
    expect(src).toContain('h-(--table-header-h)');
    expect(src).toContain('h-(--table-row-h)');
    expect(src).toContain('px-(--table-cell-px)');
  });

  test('TableShell.tsx 无残留硬编码 h-11 / h-14 / px-2', () => {
    const src = readFileSync('src/components/pro/TableShell.tsx', 'utf8');
    expect(src).not.toMatch(/\bh-11\b/);
    expect(src).not.toMatch(/\bh-14\b/);
    expect(src).not.toMatch(/px-2(?![\d.])/);
  });
```

- [ ] **Step 2: 运行确认失败**

Run: `./node_modules/.bin/vitest run --exclude '.claude/**' src/components/pro/__tests__/table-density.test.ts`
Expected: 新增两条 FAIL（TableShell 尚含 h-11/h-14/px-2，token 引用缺失）。

- [ ] **Step 3: 改 TableShellHeader（h-11 + px-2）**

old_string:
```
        'grid h-11 items-center bg-(--table-header-bg) px-2 text-[calc(13px*var(--app-scale))] font-medium text-(--table-header-fg)',
```
new_string:
```
        'grid h-(--table-header-h) items-center bg-(--table-header-bg) px-(--table-cell-px) text-[calc(13px*var(--app-scale))] font-medium text-(--table-header-fg)',
```

- [ ] **Step 4: 改 TableShellRow（h-14 + px-2）**

old_string:
```
        'ui-table-row grid h-14 items-center border-t border-(--table-border) px-2',
```
new_string:
```
        'ui-table-row grid h-(--table-row-h) items-center border-t border-(--table-border) px-(--table-cell-px)',
```

- [ ] **Step 5: 改 TableShellLoadingRows（h-14 外层 + px-2 外层 + px-2 内层 cell）**

> 现码：外层 `className="grid h-14 items-center border-t border-(--table-border) px-2"`（L107），内层 cell `<div key={cellIndex} className="px-2">`（L111）。骨架行高对齐数据行 `--table-row-h`。

5a. 外层，old_string:
```
          className="grid h-14 items-center border-t border-(--table-border) px-2"
```
new_string:
```
          className="grid h-(--table-row-h) items-center border-t border-(--table-border) px-(--table-cell-px)"
```

5b. 内层 cell，old_string:
```
            <div key={cellIndex} className="px-2">
```
new_string:
```
            <div key={cellIndex} className="px-(--table-cell-px)">
```

- [ ] **Step 6: 运行确认通过 + 类型 + lint + table-primitives 不退化**

Run:
```bash
./node_modules/.bin/vitest run --exclude '.claude/**' \
  src/components/pro/__tests__/table-density.test.ts \
  src/components/pro/__tests__/table-primitives.test.tsx
./node_modules/.bin/tsc -b --noEmit
./node_modules/.bin/eslint src/components/pro/TableShell.tsx
```
Expected: table-density 全 PASS（ui + pro 断言）；table-primitives 不退化（它只断言颜色 token，几何改动不影响）；tsc/eslint 无报错。

- [ ] **Step 7: 提交**

```bash
git add src/components/pro/TableShell.tsx src/components/pro/__tests__/table-density.test.ts
git commit -m "feat(pro): TableShell 行高/内距走 --table-* token，与 ui/table 几何统一"
```

---

# Task 5：矩阵验收（视觉档差 + 全量守卫 + 范围自检）

**Files:** 无代码改动，纯验收。`/dev/theme-states` 已含 DataTable + TableShell 展示（`dataTableRows` / `tableTokenRows`），`--table-*` 分档后 18 格 theme-matrix 自动体现两套表格的行高/内距档差。

- [ ] **Step 1: 全量守卫与测试**

Run:
```bash
./node_modules/.bin/tsc -b --noEmit
./node_modules/.bin/eslint src
./node_modules/.bin/vitest run --exclude '.claude/**'
pnpm theme:guard   # 跑前确认无 .claude/worktrees 残留
pnpm design:lint
```
Expected: 全绿。`theme:guard` 三文件均通过（引用完整性含 `--table-*`；snapshot 含新断言；模块边界不涉及）。`design:lint` **exit 0**（见 Task 1 Step 4 的 schema 说明）。

- [ ] **Step 1.5: 确定性渲染几何断言（不可跳过 —— 堵 G1 视觉盲区）**

> 对抗验证指出：文本守卫 `table-density.test.ts` 只 grep 源码串（测不到渲染几何），jsdom 也不解析 CSS，若视觉证据全挂"可跳过"的 agent-browser，存在「全绿交付零像素证据」的 G1 口子。本步用 agent-browser + `getComputedStyle` 读**实际渲染几何**，机器可读、确定性，**必跑**。

前提：本地 dev server + agent-browser（本项目 `visual:matrix` 已在用，复用 `scripts/visual-agent-browser.mjs` 的登录/导航）。启动 dev、登录、开 `/dev/theme-states`，对每 flavor `setMatrixSelect('flavor', X)` 后 CDP `eval` 读表格实际几何：
- 表头行 `getBoundingClientRect().height`
- 数据行 `getBoundingClientRect().height`
- 数据 cell `getComputedStyle(...).paddingInline`

Expected（md 档 `--app-scale=1` 实际渲染值）：

| flavor | 表头 | 数据行 | cell padX |
| --- | --- | --- | --- |
| feishu | 48 | 44 | 12 |
| shadcn | 44 | 44 | 12 |
| claude | 48 | 48 | 16 |

断言实际值 == 三档值表；任一不符即停。**若环境确无 agent-browser**，明确记录「未跑确定性渲染断言 + 原因」到任务文档，且**不得宣称视觉验收完成**（是显式记录缺口，不是默默跳过）。

- [ ] **Step 2: 实跑 18 格矩阵采集（e2e，视觉留档）**

> 依赖 `agent-browser` CLI。若环境无该 CLI，明确记录「未实跑」+ 原因到任务文档，不得宣称完成。

Run:
```bash
pnpm visual:matrix
```
Expected: `test-results/m0-visual/theme-matrix/` 下重新生成 18 张 `{flavor}-{mode}-{scale}.png`；过程无 `horizontal overflow` 抛错；表格行高/内距在三风格间呈现档差。

- [ ] **Step 3: 抽查截图确认表格档差（辅助证据 + 结构性检查）**

> ⚠️ 证据定位：`--table-row-h` claude 48 vs feishu/shadcn 44 差 4px、表头 feishu 48 vs shadcn 44 差 4px、cell padX claude 16 vs 12 每侧差 4px——单项差占整页 <1%，压缩 PNG 肉眼可能分不出。**确定性证据是 `table-density.test.ts` + `tokens.snapshot.test.ts` + `assertNoHorizontalOverflow` 三层自动化断言**（Step 1/2 已跑绿）。本步截图捕捉「整体没崩 / 无溢出 / 无跳档 / 行不塌陷」这类结构性问题。

用 Read 工具打开对比（文件名以 Step 2 实跑产物为准）：
- `test-results/m0-visual/theme-matrix/claude-light-md.png`（表格行更高 48、内距更宽 16）
- `test-results/m0-visual/theme-matrix/feishu-light-md.png` / `shadcn-light-md.png`（紧凑 44 / 12）

抽查确认（结构性）：三档 scale 下行高随 `--app-scale` 等比变化、无横向溢出、无跳档；DataTable/TableShell 数据行从旧 56 收紧到 44 后**行内容不塌陷、垂直居中正常**（本切片最大视觉变化点，重点看）。若需像素级确证，可选加一步 `getComputedStyle` 读实际 `height`/`padding-inline`。

- [ ] **Step 3b（可选）: 真实业务列表页集成抽查**

> 现有列表页（`/admin/users` 等）用 DataTable/TableShell，数据行 56→44 是可见收紧。用 agent-browser 截 `/admin/users` 三 flavor 各一张，确认行高收紧后表格不塌、操作列按钮垂直居中、无换行错位。环境无 agent-browser 可跳过并记录，不阻断完成判定。

- [ ] **Step 4: 确认未碰全局 --spacing 与字号（范围纪律自检）**

Run:
```bash
git diff --stat main -- src/styles/global.css
git diff main -- src/components/ui/table.tsx src/components/pro/TableShell.tsx | grep -E "text-\[calc\(13px" | head
grep -rn "\-\-card-" src/styles/tokens.css
```
Expected: `global.css` **无改动**（`--spacing` 未动）；`--card-` **无命中**（未越界引入 card token）；字号未动——注意 `text-[calc(13px*var(--app-scale))]` 与几何类同在一条 className 串上，几何改动会让整行进 +/- diff（**这是正常的，不是字号被改**），关键是 13px 那段在 +/- 两侧**逐字节相同**。用 `git diff main -- src/components/ui/table.tsx src/components/pro/TableShell.tsx | grep -c "13px"` 确认删除行与新增行的 13px 计数相等（增删各半、净零）。

---

## Self-Review（作者自检，已执行）

**1. Spec 覆盖：**
- PRD §7.5「密度/间距维度」table 子集 → Task 1-5 ✅。Card 明确剥离（裁剪说明 5）。
- PRD §7.5 实施纪律「design.md 值表回填 → tokens.css → 组件消费 → snapshot/guard → 矩阵」→ Task 1（值表）/ Task 2（token+snapshot）/ Task 3-4（组件消费）/ Task 5（矩阵+guard）✅。
- PRD §7.5 红线「严禁分叉全局 --spacing」→ Task 5 Step 4 显式自检 ✅。
- 洋哥拍板「仍做 flavor 档差」→ 三档值表（feishu/shadcn/claude 行高与内距分档）落地 ✅；claude 据合规（cell padX 复用 field-px 有 spacing.md 据，行高唯一外推 +4）。

**2. 占位符扫描：** 无 TBD/TODO；每个改代码步骤含完整 old/new_string 或完整代码块。Task 2 Step 3c 的 shadcn 锚点已由 worktree 对抗验证实测钉死为 `--option-check: var(--text);`（`grep -Fc`=1），不再是「执行时任选」。

**3. 类型/命名一致性：** `--table-cell-px`/`--table-row-h`/`--table-header-h` 在 tokens.css 声明、snapshot 断言、三组件 `h-(--..)`/`px-(--..)`、table-density 测试四处逐字一致；值 44/48/`var(--field-px)` 跨 Global Constraints 值表、Task 1 design.md、Task 2 token、Task 5 抽查一致。

**4. 风险点已在计划内消解：**
- 声明/消费顺序（theme-guards Test 1）：Task 2 先声明、Task 3/4 后消费（Step 7 显式验证）。
- 会红的现有测试：`data-table.test.tsx:169` px-3 断言在 Task 3 Step 5 同步更新；`table-primitives.test.tsx` 经核实只测颜色不受影响。
- ui 线机制变更（py 撑高 → 固定行高）：TableCell 加 `h-(--table-row-h)` + 保留 `align-middle`；DataTable 删 `bodyCellClassName` 避免 py 叠加破坏固定行高（Task 3 Step 4）。
- 视觉收紧（56→44）：裁剪说明 3 + Task 5 Step 3/3b 显式抽查行不塌陷。
- claude 不覆盖 header-h（继承 48）、shadcn 不覆盖 row-h（继承 44）、cell-px 靠 field-px 自动分档：Task 2 三处注明。

**已知遗留（不在本切片范围）：**
- 字号阶梯（表头实测 14 vs 现码 13）→ 独立维度另成切片。
- Card 密度 → Phase 3 组件收敛。

---

## 对抗性校订记录（2026-07-08，两路对抗验证后修订）

**本计划所有 `old_string` 均按 `HEAD` 现码 recon 校准**，并经**两路对抗验证**（隔离 worktree 真执行 + 静态审查）实证：

- **worktree 真执行**：严格照计划跑 Task 1-4——old_string **0 处失配**（对比 field-px 初版 9 处全失配）、TDD 红绿全真实、全量守卫除 design:lint 外全绿（tsc0 / eslint0 / vitest **355 passed** / theme:guard **130 passed**）。
- **td 去 py 改固定行高（最大机制变更）经 agent-browser 真浏览器实测**：短内容 `align-middle` 完美居中、高内容撑到 102px `child_clipped:false`（min-height 不裁切）、档差真实（claude 行 50 vs feishu 46）。
- **`h-(--x)` 合法性**：用项目 tailwindcss 4.3.2 编译器实测产出 `height: var(--table-row-h)`，元素无关（td/grid 同）。
- **CSS 级联继承**：`data-flavor` 挂 html 元素，`:root` 与 `[data-flavor]` 同元素、特异性相等、后者胜 → claude 继承表头 48、shadcn 继承行高 44 成立。

**两路揪出并已在本计划修订的 4 项**：
1. 🔴 **design:lint 硬阻断**：`rowHeight`/`cellPaddingX` 是 schema 外臆造键（`@google/design.md` 不认）→ `exit 1`（实测坐实，非 static 猜的对比度问题）。已改：design.md 只用 schema 认的 `height`+`padding`，数据行高真相源留 tokens.css（Task 1 Step 4 改为必跑）。
2. 🔴 **shadcn 锚点撞车**：`[data-flavor='shadcn'] {` 文件内出现 2 次。已改：确定锚点 `--option-check: var(--text);`（Task 2 Step 3c）。
3. 🔴 **视觉验证 G1 盲区**：证据全挂可选 agent-browser。已改：Task 5 Step 1.5 加不可跳过的 `getComputedStyle` 渲染几何断言。
4. 🟡 **两套机制非完全等价**：td min-height 撑高 vs grid 硬高裁切。已在裁剪说明 2 注明。

**执行者开工前仍建议**：逐条 `node -e "console.log(require('fs').readFileSync(FILE,'utf8').includes(OLD))"` 复验 old_string 为 `true`（防现码在两路验证后又变动）。worktree 对抗验证的临时 worktree 可清理（`git worktree remove`）。

---

## 执行交接

**计划已保存到 `docs/superpowers/plans/2026-07-08-design-density-table.md`。两种执行方式：**

1. **Subagent-Driven（推荐）** — 每个 Task 派新 subagent 执行，Task 间两阶段 review，迭代快。
2. **Inline Execution** — 本会话内按 executing-plans 批量执行，设检查点 review。

**选哪种？**
