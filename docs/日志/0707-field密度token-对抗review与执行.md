# 0707 field 密度 token —— 对抗 review 与执行落地

> 接续「设计系统 preset 化」基础层计划，执行 Phase 2b 第一个密度切片：给三套 flavor 的输入框水平内距做 per-flavor 分档，兑现「量走 token」方法论的第一个密度维度。

## 干了啥

- **目标切片**：新增 `--field-px` 组件族密度 token（`:root`/feishu/shadcn 12px、`[data-flavor='claude']` 16px），5 个 field 组件（Input/InputGroup/InputGroupAddon/NativeSelect/SelectTrigger/Textarea）+ SearchField 从硬编码 `px-3`/`px-2.5` 改为消费 token。绝不碰全局 `--spacing`（红线：全局分叉会引发业务页布局漂移）。
- **没有直接开工，先对实施计划做三轮对抗 review**：
  1. 主进程逐条 diff 现码，发现计划的 **9 处 `old_string` 全部与当前源码对不上**（阻断级，会让 Edit 全失败）。根因：计划照重构前的旧码写、没对现码校验——`transition-[color,box-shadow]` 早被重构成四值版、SearchField API 从 `size` 改成 `inputSize`、design.md 用 `rounded/typography` 语义引用而非裸值。用 `content.includes(oldString)`（与 Edit 工具同逻辑）+ 唯一性 count 逐条坐实，0 误报。
  2. 按现码逐字重写全部载荷层，并堵一个护栏洞（`not.toContain('border px-3')` 抓不到 InputGroupAddon 的 `border-r px-3` → 改 `not.toMatch(/px-3(?![\d.])/)`）。
  3. 派三路对抗 agent（隔离 worktree 真执行 / 测试守卫严密性 / 设计纪律合规）交叉核验，又揪出：theme-states 覆盖描述被我写错、SearchField 验收路径最弱、Task 4 肉眼验收过度自信。
- **关键决策：SearchField 验收路径**。它是全切片里唯一影响真实业务页面所有 flavor 的改动（10px→12/16px），初版却被路由到最弱的手动截图验证（还能「无环境就记未实跑」放行）。改为**进 theme-states 矩阵做确定性截图**——最高风险项配最强验证，同时闭合 CLAUDE.md「改造 Pro 组件必须同步状态矩阵，否则 token 化不算完成」纪律。为此新增 Task 3.5（含手抄 open 态 Select 演示块的 px-3 对齐 + i18n key + 守卫断言）。
- **执行落地**：生成高标准 Codex 提示词（红线：old_string 匹配失败=停下而非放宽、没实测不说完成、只做范围内的事、visual matrix 必须真跑）。Codex 逐 Task 执行、fast-forward 合并 main。
- **独立复核全绿**（不信自我报告，主进程亲跑）：`tsc` 0 / `eslint` 0 / `vitest` 46 files·346 passed / `theme:guard` 126 / `design:lint` 0 / `build` 成功且 dist 无 faker/msw/mockServiceWorker。改动逐字照计划、零降标（input.tsx 的 `w-full min-w-0 overflow-hidden` 原封未动）、零越界（正好 13 个点名文件、4 个 commit）。

## 教训 / 洞察

- **实施计划的「可执行载荷层」必须对现码逐字校验，不能靠记忆或旧码**。若直接开工，9 处 old_string 会让 Edit 全失败；更糟的是执行者放宽匹配硬套，会误删 `w-full min-w-0 overflow-hidden` 等真实类造成隐性回归。校验成本极低（`includes` + count），价值极高。
- **对抗 review 要多视角、多轮**。三路 agent 各揪出不同层次问题（可落地性 / 测试严密性 / 设计纪律），单视角覆盖不了。**worktree 真执行是最强证据**——把「计划应该能跑」升级成「计划真跑过全绿」。
- **好工具也有副作用，要防并收尾**。隔离 worktree 验证时软链主仓库 `node_modules` + 跑 `CI=true pnpm`，pnpm 透过软链把主仓库 26 个顶层包重链到 worktree 的 `.pnpm` store，删 worktree 后断链 → 害下游 Codex 撞 `MODULE_NOT_FOUND`。修复：主仓库 `pnpm install` 重建。已沉淀 memory：worktree 验证别软链 node_modules。
- **快速核验命令本身也要防假阳性**。复核 Codex 时图快用了连续字符串 grep 查本不连续的类、用双引号 awk 让 `[data-flavor='shadcn']` 变成字符类正则，连报两次假阳性——追进 diff 每次都是我命令写错、代码是对的。核验要用可靠方法（diff / 分别 grep / includes）。

## 验证结果

| 项 | 结果 |
|---|---|
| tsc / eslint | exit 0 |
| vitest 全量 | 46 files / 346 passed |
| theme:guard | 126 passed |
| design:lint | exit 0（warning 全在白名单） |
| build + 剥离 mock | dist 无 faker/msw/mockServiceWorker |
| `--spacing` 红线 | global.css 零改动 |
| 范围 | 无 card/table token 越界，`--field-px` 分档 :root 12 / claude 16 / shadcn 继承 |

## 遗留

- main 领先 origin/main 5 个 commit，**未 push 远端**（待决策）。
- Task 4 的 18 格视觉矩阵（agent-browser e2e）未跑——已在计划里降级为「辅助抽查、非唯一凭据」，确定性证据已全绿；肉眼视觉闭环可选补。
- Phase 2b 后续密度切片：table 密度是第二切片（需先统一 `ui/table.tsx` 与 `pro/TableShell.tsx` 两套几何）；字号阶梯、控件高度等按同 playbook 各自成切片。
