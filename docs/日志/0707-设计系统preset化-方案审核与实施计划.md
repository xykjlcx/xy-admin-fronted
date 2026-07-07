# 0707 设计系统 preset 化：方案审核与实施计划

今天没有代码提交，全部是方案/计划文档产出（未 commit）。围绕「让切风格像 shadcn 一样彻底」这条主线，审核 Codex 写的 PRD 并写出第一份实施计划。

## 一、四路实测调研审核 PRD

- 问题：Codex 写了一份 shadcn/create 启发的设计系统 PRD，需要审核它对 shadcn 机制的提炼是否准确、对我们现状的描述是否属实、方案是否到位。
- 过程：没有停在纸面判断，派四路 subagent 交叉实测——
  1. 仓库现状矩阵（逐条核实 PRD 声称的 8 项现状 + 三套 flavor 到底差什么维度）；
  2. shadcn CLI 4.13.0 源码 + registry 端点机制（含在临时目录用不同 preset 各 init 一个项目实测）；
  3. base-nova/sera/rhea/luma 四套 registry 展平源码逐组件 diff；
  4. 用 agent-browser 对 /create 预览页 Nova vs Sera 逐元素取 computed style。
- 结论（关键事实）：
  - shadcn 六个 style 的 cssVars **逐字节相同**，style 差异 100% 在组件 class 层、0% 在 CSS 变量层；/create 切 style 只是 body 上 `style-nova→style-sera` 一个 class 换预置 CSS 分支。
  - 官方无可复用的「语义类→per-style CSS」交付物（cn-* 只存在于官方站内），也不支持项目内运行时切 style。
  - 我原稿担心 PRD 编造的 `base-color-*` 类经浏览器实测确认真实存在（静态 grep 漏了）；`<style id="design-system-theme-vars">` 才是真的查无此物。
- 耗时：约 2 小时（含四路 subagent 并行）。

## 二、更新 PRD（Draft v2）

- 机制勘误：改正「CLI 安装时转换语义类」（实际是官方 registry 服务端展平）、删除脑补的 `<style id>` 细节、补正注入变量为 4 个。
- 新增 §5.3「要素清单 + 量/型边界」：把 shadcn style 切换改变的四类要素（几何/排印/边框背景阴影策略/形状拓扑）连同 Nova→Sera 精确实测值写进 PRD；给出「量走 token、型走 [data-flavor] 分支」的落地判据。
- 新增 §7.5 per-flavor 几何/密度/排印 token P1：这是「切风格呈现体系级差异」的核心工作，也是原 PRD 最大缺口。附「现状缺口 × shadcn 维度」对照矩阵 + 实施纪律（密度落组件族 token，不分叉全局 `--spacing`）。
- 新增 §6.6 机制层四改进（style profile 文件化、token contract + 完备性 guard、组件挂点、视觉矩阵自动化）、§7.8 第四套风格 Sera 验收用例。
- 结论：现状比「纯换色」多（圆角系数/按钮高度字重/输入框三模型/衬线标题已分 flavor），但 per-flavor 间距与字号阶梯没实现——这是「不够彻底」的根因。

## 三、两轮 review + 对抗性终审

- 对 PRD 派对抗性终审 subagent，逼出 5 条计划层缺陷：§7.2 官方同步（P0）却排到 Phase 4 的优先级倒挂、font/menu 三处口径打架、menuColor/menuAccent 零 token 支撑的幻想轴混进 P0 类型、值表研究与消费阶段顺序倒挂、验收矩阵是没人负责建的空头支票。全部改文档修掉。
- 事实底座核对：终审逐条核实 PRD 声称的现状（`--radius-factor` 0.75/1/1.25、`--control-btn-md` 仅按钮高度分 flavor、`--field-*` 三模型、`--font-display` claude 衬线、全局单一 `--spacing`、design.md 值表等）全部属实。

## 四、写第一份实施计划（基础层）

- 范围：刻意只覆盖 Phase 1（预设模型）+ Phase 2（面板重组）+ Phase 2b 第 0 切片（视觉矩阵），不把 PRD 五阶段塞进一份巨型计划——每份计划要能独立跑通、独立 review。
- 7 个 Task，全 TDD：
  - Part A：`design-presets.ts` 预设数据 → store `applyPreset` → 官方同步规则文档。
  - Part B：Preset/Theme/Shell 分组文案 → 外观抽屉重组（风格卡套用完整预设）。
  - Part C：theme-states 加显示比例选择器 → 视觉脚本 matrix 命令（3 flavor × 3 scale × 明暗 = 18 格采集 + 无横向溢出断言）。
- 三处主动裁剪（反过度工程，写进计划）：砍 `matchActivePreset`（零消费方）、不重构 store 持久化结构（避免动 localStorage/FOUC 契约）、font/menu 幻想轴不进类型。
- 对计划再派对抗性审计（逐段核对真实源码）：结论可执行、无阻塞缺陷；我抽查担心的 `theme:guard` 变红被逐条守卫核对证伪。修掉 3 处会绊到零上下文执行者的小坑（错误的定位指引、缺 Edit 锚点、`presetToPatch` 零消费）。

## 五、附带产出

- 全局 rule `verify-before-dismiss` 补「静态 grep 不能证伪运行时行为」+ 数据落地。
- 项目 memory「设计系统量/型双层」（auto-load，指导后续 Phase 2b 执行）。
- HTML 规划速览 artifact（给洋哥扫读用，八板块覆盖问题/实测/量型方法论/路线/7 Task）。

## 待办

- 执行方式待定（推荐新会话 subagent 逐 Task）。
- 执行前先 commit 今天三个未提交 docs，再切 `feat/design-preset-foundation` 分支。
- PRD 剩余阶段（Phase 2b 主体 / Phase 3 组件收敛 / Sera）待做到对应节点再各写一份计划。
