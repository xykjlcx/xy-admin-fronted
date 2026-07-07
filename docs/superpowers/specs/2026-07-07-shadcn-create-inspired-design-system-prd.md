# shadcn/create 启发的多风格设计系统改造方案

- 日期：2026-07-07
- 状态：Draft v2 — 同日完成实测审核修订（机制勘误 + 新增 per-flavor 几何/密度/排印 P1；证据：CLI 4.13.0 源码、registry 展平源码逐组件 diff、/create 预览 computed style 实测）
- 范围：外观模型、主题 preset、基础组件样式收敛、官方 shadcn 同步策略、验证门禁
- 不在范围：业务页面重构、后端接口、权限模型、路由纵切迁移、Ant Design/Arco/MUI 等组件库替换

## 1. 结论

当前技术选型不需要换。真正要改的不是 shadcn，而是把我们现有的 `flavor / accent / mode / zoom / radius / layout` 从“若干运行时开关”升级成一套明确的设计系统配置。

shadcn/create 的价值不在于它多了几个主题色，而在于它把视觉系统拆成了稳定轴：

- `style`：组件气质，影响按钮、输入框、菜单、间距、圆角、字号、阴影、focus ring。
- `baseColor`：中性色底色体系。
- `theme`：主色/语义色体系。
- `chartColor`：图表色体系。
- `font/fontHeading`：字体体系。
- `radius`：圆角体系。
- `menuColor/menuAccent`：菜单独立风格。
- `base`：组件底座，属于架构选择，不进视觉 preset。

我们现在已经有一部分正确底座：`data-flavor`、`data-mode`、`--app-scale`、组件状态 token、`/dev/theme-states`、`theme:guard`、`design:lint`。所以最佳方案不是推倒重做，而是在现有 token 化成果上补一层 `DesignSystemPreset`，补全 per-flavor 几何/密度/排印维度（§7.5，“体系级差异”的直接来源），再用 shadcn/create 的思路治理基础组件和外观面板。

## 2. 背景与问题

### 2.1 现状

当前外观状态分散在几处：

- `src/config/appearance.ts`：默认值，包含 `flavor/mode/accent/customAccent/zoom/radius/layout/pageAnim`。
- `src/stores/appearance.ts`：Zustand 持久化运行时状态。
- `src/lib/appearance-dom.ts`：唯一 DOM 出口，写入 `data-flavor/data-mode/data-zoom/data-radius`，并注入 `--pri/--pri-active/--pri-soft/--on-pri`（`--pri/--on-pri` 恒写，中间两个有值才写、暗色下移除交还 CSS 兜底）；`index.html` 的 FOUC 脚本首帧旁路注入同一组变量（读 store 持久化的 `_pri*Resolved`）。
- `src/styles/tokens.css`：三套 flavor 的 primitive/semantic token 和组件族 token。
- `src/styles/global.css`：Tailwind v4 `@theme inline` 映射、`.ui-field` 等状态机。
- `components/ui` 和 `components/pro`：已经部分消费 `--button-*`、`--option-*`、`--menu-item-*`、`--table-*` 等组件 token；`--field-*` 由输入类组件挂 `.ui-field` 状态机间接消费（theme-guards 禁止绕过）。
- `AppearanceDrawer`：面向用户的外观入口，包含风格、布局、主题色、动画、缩放、圆角六组；明暗 mode 不在抽屉内，由 header 的独立 `DarkModeToggle` 承担。

这说明我们不是“没有设计系统”，而是已经有了一个可运行的主题系统雏形。

### 2.2 核心问题

问题不是 Tailwind 本身，也不是 shadcn 本身，而是样式职责还没有完全收敛。

当前仍能看到三类混杂：

1. **组件层已经 token 化，但还没有形成 preset 模型**
   - Button/Input/Select 已经开始消费组件 token。
   - 但 `flavor` 同时承担“组件气质”和“默认品牌色”的职责。
   - `layout/pageAnim/zoom/radius` 和视觉 preset 没有清晰边界。

2. **页面层还有视觉状态尾巴**
   - 业务页面中仍有 `bg-pri-soft`、`text-pri`、`bg-pri` 等 primitive class。
   - 有些是业务强调色，允许保留；有些是通用控件状态，应该下沉到 `ui/pro`。

3. **官方 shadcn 同步策略还不够产品化**
   - 仓库已经是 shadcn source-code 模式。
   - 但我们不能盲目 `shadcn apply` 或 `--overwrite`，否则会丢掉本地 `--app-scale`、组件 token、变体扩展。
   - 需要明确“官方源码如何进来，本地 token 如何保留”的流程。

4. **flavor 的几何/密度/排印维度没做全（“切风格不如 shadcn 彻底”的根因）**
   - 已分 flavor 的维度：颜色、圆角系数（0.75/1/1.25）、按钮高度/字重、输入框边框模型（`--field-*` 三型）、交互填充 alpha、展示字体（claude 衬线）。
   - 未分 flavor 的维度：间距/密度（全局单一 `--spacing`）、字号阶梯、按钮以外的控件高度、focus ring 宽度、阴影、大小写/字距、badge/slider/checkbox/card/table 的形态。
   - 关键证据：`docs/design/feishu.design.md`（spacing md=12）与 `docs/design/claude.design.md`（md=16）在值表层规定了密度差异，但 tokens.css 用单一全局 `--spacing` 抹平——值表有、实现没接。

## 3. 产品目标

### 3.1 用户目标

作为脚手架使用者，我希望：

- 可以像 shadcn/create 一样选择一套完整视觉风格，而不是只换主色。
- 可以在 Claude / 飞书 / shadcn 风格之间切换，按钮、输入框、菜单、表格、导航都呈现体系级差异。
- 可以继续切换明暗、主题色、显示比例、圆角、布局。
- 业务页面开发时不需要理解主题细节，只组合基础组件和 Pro 组件。

### 3.2 工程目标

- 页面层只保留布局类，不表达通用 hover/focus/active/selected/open 状态。
- 基础组件的视觉状态集中在 `components/ui`、`components/pro` 和 token 层。
- 新增一个风格时，主要新增 preset/token/style profile，而不是逐页面修 className。
- 能继续使用官方 shadcn 源码作为上游参考，但不被官方覆盖本地定制。
- 所有约束由 guard 和状态矩阵守住，不靠人工记忆。

## 4. 非目标

- 不换 Ant Design、Arco、MUI。
- 不把 shadcn 当 npm 黑盒组件库。
- 不直接把 shadcn/create 官方实现整套搬进当前仓库。
- 不运行 `shadcn apply` 覆盖当前组件。
- 不追求页面级完全零 `className`。页面仍然可以写布局类，例如 `flex/grid/gap/padding/width`。
- 不做在线逐轴自由组合编辑器（/create 的自由组合形态不是目标）；产品形态是**有限预设一键切换 + 少量细调轴（accent/radius/scale）**，因此无需复刻官方站内 cn-* 全套运行时机器。
- 不做 chartColor 轴（shadcn 有此轴；我们仪表盘图表色暂走语义 token，真出现图表体系需求时再补 `--chart-1..5`）。
- 不把布局切换混进主题 preset。布局是结构轴，不是视觉轴。

## 5. shadcn/create 机制提炼

### 5.1 它支持什么

shadcn/create 支持的核心能力：

- 风格选择：Nova、Vega、Maia、Lyra、Mira、Luma、Sera、Rhea。
- Base Color：Neutral、Stone、Zinc、Gray、Mauve、Olive、Mist、Taupe 等。
- Theme：主色体系。
- Chart Color：图表配色体系。
- Icon Library：Lucide、Hugeicons、Tabler、Phosphor、Remixicon。
- Font / Heading Font。
- Radius。
- Menu Color / Menu Accent。
- Preset code：例如默认 `b0`。
- CLI 应用：
  - 新项目：`shadcn init --preset <code>`
  - 旧项目：`shadcn apply --preset <code>`
  - 局部应用：`shadcn apply --preset <code> --only theme`

参考：

- https://ui.shadcn.com/create
- https://ui.shadcn.com/docs/cli
- https://ui.shadcn.com/docs/changelog/2026-04-preset-commands
- https://ui.shadcn.com/docs/changelog/2026-04-partial-preset-apply

### 5.2 它怎么实现（2026-07-07 实测勘误版）

官方机制可以拆成三层（经 CLI 4.13.0 源码、registry 端点、/create 预览 DOM 三路实测核对）：

1. **Preset 编码层**
   - 将 `style/baseColor/theme/chartColor/iconLibrary/font/fontHeading/radius/menuAccent/menuColor` 编码成 version-prefixed base62 短码。
   - `base` 不进 preset，因为它是架构底座，不是视觉样式。
   - 实测硬结论：**六个 style 的 cssVars 逐字节相同**（`/init` 端点对照实验）——cssVars 只是 `baseColor+theme+radius+font` 的函数，**style 不改任何 CSS 变量，差异 100% 在组件 class 层**。

2. **运行时预览层（/create 站内私有机制，未对外交付）**
   - 预览渲染在同源 iframe（`/preview/base/preview-02`），组件用稳定语义类 `cn-button/cn-input/cn-select-trigger`，body 挂 `style-nova base-color-neutral theme-default` 等类。
   - 切 style = body 的 `style-nova → style-sera` 单 class 替换（组件元素 classList 逐字节不变），全部 style 分支 CSS（`.style-<name> .cn-*`）预先打包在外链 stylesheet 里，靠祖先 class 激活分支；颜色主题另有运行时变量注入（`buildThemeForPreset()`）。
   - 勘误：初稿写的 `<style id="design-system-theme-vars">` 查无此物；`base-color-*` 类属实（挂在预览 iframe 的 body 上）。
   - 附带发现：radius 轴的 `default` 档按 style 解析——Sera 下解析为 0（组件本身也用 `rounded-none` 焊死锐角），切 style 时面板 Radius 显示随动，preset 编码里 radius 仍是 `default`。

3. **源码分发层**
   - 上游 canonical 源码（`ui.shadcn.com/code/apps/v4/registry/bases/radix/ui/*.tsx`）使用语义类，style 无关。
   - 勘误：初稿写“CLI 安装时把语义类转换成 Tailwind class”——实际转换发生在**官方 registry 构建/服务端**：`/r/styles/{style}/{name}.json` 分发的已是按 style 展平好的 Tailwind class，CLI 只下载写盘；CLI 本地 transform 仅限 menuColor/menuAccent（如 `bg-popover` → `bg-popover/70 backdrop-blur`）和图标库 import 重写。
   - 含义：**官方没有任何可复用的“语义类 → per-style CSS”交付物**（cn-* 映射只存在于官方站内），也不支持用户项目内运行时切 style——唯一官方路径是 `apply`/`init --force` 重写组件源码。

关键差异：官方项目“安装时选定一种 style 并固化”；我们的脚手架需要“运行时一键切换预设”。我们已有的 `data-flavor + token + .ui-* 状态机` 与官方站内预览机制**同构**（对应 `style-* body class + cn-* 语义类 + 预置 CSS 分支`），不需要新发明机制，需要的是把差异维度补全（见 5.3 与 7.5）。

### 5.3 一个 style 到底改了什么——要素清单（实测）

对 base-nova / base-sera / base-rhea / base-luma 四套 registry 展平源码逐组件 diff，加上 /create 预览 8 个元素的 computed style 三方对照（Nova/Sera/Rhea），style 切换改变的要素：

| 维度类别 | 具体要素 | 实测例证（Nova → Sera） |
| --- | --- | --- |
| 几何 | 圆角策略、控件高度、水平/垂直 padding、卡片内距、表格行高 | 按钮 h 32→40、px 10→24；卡片内距 16→32；表头 h-10→h-12；圆角 10px→0 |
| 排印 | 字号、字重、text-transform、letter-spacing、行高 | label 14px/500 → 12px/600 + uppercase + 0.3px 字距；按钮文案 uppercase + 1.2px；卡片标题 uppercase + 0.9px |
| 边框/背景/阴影策略 | 输入框全框 vs 仅下划线 vs 透明+填充；卡片扁平 ring vs 投影；focus ring vs 底边变色 | select 全框描边 → 只留底边一条线；卡片无投影 → shadow-sm；输入框 focus 从 ring-3 改为无 ring、底边变色 |
| 形状拓扑 | slider thumb 圆/方/胶囊、badge 填充药丸 vs 无底文字、checkbox 圆角 vs 直角 | thumb 白色描边圆点 → 深色实心方块；badge 描边药丸 → 去边框去 padding 的纯大写裸文字 |

两个结论：

1. **官方存在两种“距离”的 style 差异**。Rhea↔Luma 是同骨架纯几何微调（只动圆角档/高度/padding，label/checkbox/separator 完全相同）；Nova↔Sera 是策略级重写（uppercase、下划线输入框、无底 badge、方 thumb）。前者天然可 token 化，后者必须组件级分支。
2. **“量”与“型”的可行性边界**（运行时切换方案的设计依据）：
   - 可变量化的是“量”：圆角大小（官方全 radius 阶梯 = `calc(var(--radius) × k)`，k 从 sm 0.6 到 4xl 2.6）、尺寸密度、字号/字重/字距、ring/阴影强度。
   - 必须 class/属性分支的是“型”：text-transform（Sera 还带上下文豁免——checkbox/radio/switch 旁 label 显式 `normal-case`）、边框拓扑、focus 反馈机制、thumb/badge/checkbox 形态。
   - 我们的落法：“量”走分 flavor token；“型”走 `[data-flavor]` 选择器分支——`--field-*` 输入框三模型（灰底反转/描边+ring/透明）已是“型分支”的现成先例。

## 6. 推荐方案

### 6.1 方案选择

有三个可选方向：

| 方案 | 描述 | 优点 | 缺点 | 判断 |
| --- | --- | --- | --- | --- |
| A. 继续现状 token 化 | 沿用当前 `flavor + token`，逐组件收敛 className | 改动最小 | 缺少 preset 模型，后续仍会散 | 不推荐作为最终方案 |
| B. shadcn/create 启发的本地 DesignSystemPreset | 保留现有实现，新增配置模型、Provider、语义类/style profile、官方同步流程 | 风险可控，和当前架构贴合 | 需要分阶段治理 | 推荐 |
| C. 深度移植官方 create/style-map/registry | 尽量复用官方 preset/style-map 机制 | 和官方最接近 | 运行时切换与官方安装时转换冲突，复杂度高 | 暂不做 |

推荐 B。

### 6.2 目标模型

新增一个本地设计系统配置模型，作为 `appearance` 的上层语义：

```ts
type DesignStyle = 'feishu' | 'claude' | 'shadcn';

interface DesignSystemPreset {
  style: DesignStyle;
  mode: 'light' | 'dark';
  accent: 'blue' | 'claude' | 'shadcn' | 'green' | 'violet' | 'custom';
  customAccent?: string;
  radius: 'sharp' | 'default' | 'round';
  scale: 'sm' | 'md' | 'lg';
}

// font / menuColor / menuAccent 暂不进类型：menu 两轴在仓库零 token 支撑、font 无用户轴与字体加载器，
// 均属 §10 头号风险“幻想轴”；待 §6.5 Advanced 真开放且 token 落地后再扩展字段（向后兼容）。
// 注意：accent 预设 key 'claude'/'shadcn' 与 style 名同名，仅表示“该风格的默认主色”，不是 style。

interface ShellPreference {
  layout: 'sidebar' | 'rail' | 'inset';
  pageAnim: 'none' | 'fade' | 'slide' | 'up' | 'scale';
  collapsed: Record<string, boolean>;
}
```

映射关系：

| 当前字段 | 新归属 | 说明 |
| --- | --- | --- |
| `flavor` | `DesignSystemPreset.style` | 组件气质，不再隐式等于品牌色 |
| `mode` | `DesignSystemPreset.mode` | 明暗 |
| `accent/customAccent` | `DesignSystemPreset.accent` | 主色体系 |
| `zoom` | `DesignSystemPreset.scale` | 保留 `--app-scale`，命名更接近设计系统 |
| `radius` | `DesignSystemPreset.radius` | 保留 |
| `layout` | `ShellPreference.layout` | 结构轴，明确不进视觉 preset |
| `pageAnim` | `ShellPreference.pageAnim` | 交互偏好，不进视觉 preset |
| `collapsed` | `ShellPreference.collapsed` | Shell 状态，不进 preset |

兼容策略：第一阶段不迁移 localStorage key，不破坏已有用户数据；只在代码内部引入转换函数。

显式决策：**flavor 捆绑 baseColor（中性色阶）**。shadcn 把 baseColor 与 theme 拆成两轴且有耦合约束（mauve/olive/mist/taupe 只配同名 theme）；我们的 style 隐含捆绑其中性色阶，不单独开 baseColor 轴——刻意简化，不加幻想轴；未来真出现“claude 气质 + 另一套中性阶”的需求再评估。

### 6.3 运行时架构

新增或重构一个 `DesignSystemProvider` 概念，职责类似 shadcn/create：

```text
useAppearance store
  -> select DesignSystemPreset + ShellPreference
    -> applyDesignSystemPreset()
      -> html.dataset.style / mode / scale / radius
      -> html.style.setProperty('--pri', ...)
      -> inject or update <style id="app-theme-vars">
```

注意：

- 第一阶段可以继续使用 `data-flavor`，避免破坏现有 CSS。
- 中期可以新增 `data-style`，并让 `data-flavor` 成为兼容别名。
- `layout` 继续由 `Shell.tsx` 选择 `SidebarLayout/RailLayout/InsetLayout`。
- `scale` 继续走 `--app-scale`，不能改回 CSS `zoom`。

### 6.4 语义类策略

官方 shadcn/create 的 `cn-button/cn-input` 思路值得吸收——我们的 `.ui-*` + `[data-flavor]` 与其站内 `cn-*` + `style-*`（body class 切换预置 CSS 分支）机制同构；官方对外的“按 style 展平分发”与运行时切换互斥，不照搬。

本仓库应保留运行时语义类：

```text
ui-button
ui-field
ui-option
ui-menu-item
ui-overlay
ui-table-row
ui-tabs-trigger
ui-nav-item
ui-shell-header
```

这些类只负责挂状态机和 token 消费。具体差异由 token 和 `[data-flavor]` / `[data-style]` 控制。

页面层允许：

- `flex/grid/gap/p-*/w-*/min-h-*`
- 业务区域布局
- 少量业务专属强调色

页面层禁止：

- 通用控件 hover/focus/open/selected/active 状态
- 输入框、按钮、菜单、表格、tabs 的基础视觉
- `bg-pri-soft text-pri border-pri ring-soft hover:bg-surface-2` 表达通用状态

### 6.5 AppearanceDrawer 改造方向

当前 `AppearanceDrawer` 已经包含所有必要轴，但信息结构偏“设置面板”，不是“设计系统选择器”。

建议改成四组：

1. **Preset**
   - Claude 风格
   - 飞书风格
   - shadcn 风格
   - 后续可以支持导入/复制 preset code

2. **Theme**
   - Mode
   - Accent
   - Custom color
   - Radius
   - Scale

3. **Shell**
   - Layout
   - Page animation
   - Collapse state 不展示或仅作为布局内部状态

4. **Advanced**
   - Font
   - Menu color
   - Menu accent
   - 后续再开放，不作为第一阶段必做

注意：Mode 目前不在抽屉内（header 的独立 `DarkModeToggle`）。把 Mode 收进 Theme 组是一次**入口迁移**，需决策 header 开关去留——建议保留 header 快捷开关、抽屉内同步同一状态，两处都只写 store。

### 6.6 机制层改进（2026-07-07 增补）

1. **Style profile 文件化**：三套 flavor 的 token 覆盖从 tokens.css 的单一 block 拆成 `tokens.feishu.css / tokens.claude.css / tokens.shadcn.css`，一套风格一个文件。加风格 = 加文件、删风格 = 删文件，与 shadcn「每个 style 一支预置 CSS 分支」同形态。代价：`tokens.snapshot.test.ts` 现硬编码断言 tokens.css 单文件内容，拆分时守卫需同步重构（约定即测试的必付账）。
2. **Token contract + 完备性 guard**：定义 style profile 的 token 清单（哪些必填、哪些可选、缺省回落到什么），guard 校验每套 flavor 对照清单的覆盖完备性。shadcn 靠 registry 构建保证每个 style 覆盖全部组件，我们的等价物就是这份 contract + 守卫。把「加风格」从“凭感觉抄”变成“填表”。
3. **「型」挂点是未来风格的插座**：§7.6 的语义类收敛不只是纪律治理——badge/card/表头等没有 token 挂点，任何新风格的形态差异就没地方挂。收敛的完成度直接决定加风格的成本。
4. **视觉矩阵自动化**：维度补全后验收矩阵为 3(4) flavor × 3 scale × 明暗，手工不可持续；把 `/dev/theme-states` 接入 `pnpm visual` 自动全矩阵截图 + diff。snapshot 只锁 token 字面值，锁不住渲染结果。现状盘点：`/dev/theme-states` 无 scale 选择器、`scripts/visual-agent-browser.mjs` 硬编码 `flavor='feishu'` 且只跑 light——矩阵自动化是要新建的活，落点为 Phase 2b 第 0 切片（验收基建先于被验收的改动）。

## 7. 需求清单

### 7.1 P0：配置模型与兼容层

- 定义 `DesignSystemPreset`、`ShellPreference` 类型。
- 提供 `appearanceToDesignSystem()` 和 `designSystemToAppearancePatch()`。
- 不改变 localStorage key。
- 不改变现有外观行为。
- 补单测证明旧状态可转换、新状态可回写。

验收：

- 当前三套 `flavor` 行为不变。
- FOUC 脚本仍能读取 `appearance`。
- `pnpm theme:guard` 不退化。

### 7.2 P0：官方 shadcn 同步治理

- 明确禁止对已定制组件使用 `--overwrite`。
- 固化流程：
  - `pnpm dlx shadcn@latest info --json`
  - `pnpm dlx shadcn@latest add <component> --dry-run`
  - `pnpm dlx shadcn@latest add <component> --diff`
  - 人工合并官方源码变化到本地 token 组件
  - diff 上游基准：优先用 style 无关的 canonical 语义类源码（`ui.shadcn.com/code/apps/v4/registry/bases/radix/ui/*.tsx`）；若走 `/r/styles/{style}` 展平端点则钉住一个 style，避免把 style 间差异误当官方改动。当前 `components.json` 的 `style: "new-york"` 是旧世代值，同步策略需明确基准
- 将官方新增组件分成三类：
  - 直接可用：未定制、无主题风险。
  - 需 token 化：Button/Input/Select/Dialog/Table 这类基础控件。
  - 不接入：和当前 Pro 层边界冲突或过度复杂。

验收：

- 文档中写清楚“官方源码是上游，不是覆盖源”。
- 不改变现有组件。

落点说明：本条实质是“动组件前先立规矩”。规则文档化随 Phase 1 落地（成本极低），Phase 4 做的是工作流工具化（checklist/脚本），不是规则本身——否则 P0 排在 Phase 4 自相矛盾。

### 7.3 P1：DesignSystemProvider

- 将当前 `applyAppearance` 职责升级成更清晰的设计系统 DOM 应用层。
- 明确：
  - 第一阶段视觉轴继续写 `data-flavor/data-mode/data-zoom/data-radius`，不引入新 dataset 命名（纯改名是 churn，见 §11 评审结论 2）。
  - `data-style/data-scale` 仅在未来确有需要时作为别名引入，届时 `data-flavor/data-zoom` 保持兼容。
  - 主色相关 CSS vars 仍通过 inline style 注入。
  - 未来动态 theme vars 可用 `<style id="app-theme-vars">` 注入。

验收：

- 外观切换行为与当前一致。
- `dark`、自定义 accent、shadcn dark primary 对比度不回归。
- Portal 浮层继承 scale。

### 7.4 P1：Preset 能力

- 提供本地 preset 对象：
  - `feishu-default`
  - `claude-default`
  - `shadcn-default`
- 每个 preset 明确包含 style/mode/accent/radius/scale；font/menu 为 reserved 轴（§6.5 Advanced），第一阶段不进 preset、不实现。
- 第一阶段不需要 base62 短码；可以先用 JSON 或 query params。
- 后续如需要分享能力，再实现类似 shadcn 的短码。

验收：

- 点击风格时应用的是完整 preset，而不是只 setFlavor。
- 切换 preset 后，accent/radius/scale 是否跟随 reset 要有明确规则。

建议规则：

- 用户点击“大风格 preset”：应用完整 preset。
- 用户在细项里改 accent/radius/scale：只改该轴。
- 用户再次点击另一个 preset：覆盖视觉轴，不覆盖 layout/pageAnim。
- mode 不随 preset 覆盖：明暗是用户环境偏好，preset 内的 mode 仅作首装默认。

### 7.5 P1：per-flavor 几何/密度/排印 token 补全（2026-07-07 新增，“体系级差异”的核心工作项）

现状缺口 × shadcn 实测维度对照：

| 维度 | shadcn style 间表现 | 我们现状 | 动作 |
| --- | --- | --- | --- |
| 圆角策略 | `--radius` × 系数阶梯 | ✅ `--radius-factor` 分 flavor × 用户档 | 已有，不动 |
| 输入框边框模型 | 全框 / 下划线 / 填充 三型 | ✅ `--field-*` 三模型 | 已有，不动 |
| 展示字体 | font/fontHeading 轴 | ✅ claude 衬线 `--font-display` | 已有，不动 |
| 间距/密度 | 卡片内距 16↔32、表格 p-2↔p-3、card-spacing 4↔8 | ❌ 全局单一 `--spacing` | 新增**组件族**密度 token（`--card-spacing`/`--table-cell-p`/`--field-px` 等），不分叉全局 `--spacing`；design.md 值表已有依据（feishu md=12 / claude md=16） |
| 字号阶梯/排印 | text-sm↔xs、medium↔semibold、tracking、uppercase | ❌ 单一 ramp；仅按钮字重分 flavor | 字号/字重/字距开放 flavor 覆盖；uppercase 属“型”，走 `[data-flavor]` 分支并设豁免机制 |
| 控件高度 | h-8↔h-10 整阶梯平移 | ⚠️ 仅 `--control-btn-md` 分 flavor | `--control-*` 阶梯整体开放 flavor 覆盖 |
| focus ring 形态 | ring-3/50 ↔ ring-2/30 ↔ 无 ring 底边变色 | ⚠️ ring 颜色分 flavor，宽度共享 3px | ring 宽度/强度 token 化（“无 ring 型”已由 `--field-ring-focus: transparent` 覆盖） |
| 阴影 | 扁平 ring ↔ shadow-sm ↔ shadow-md | ❌ 全局共享、注释“与主题无关” | 卡片/浮层阴影档开放 flavor 覆盖 |
| 表格密度/表头排印 | h-10/p-2 ↔ h-12/p-3 + 表头 uppercase 小灰字 | ❌ | `--table-*` 补密度与表头排印维度 |
| badge/slider/checkbox 形态 | 药丸 vs 裸文字、圆 vs 方 thumb | ❌ | 克制：仅当三风格 design.md 值表有真实差异依据才做，不为差异而差异 |

实施纪律：

- 密度落点边界（与 shadcn 实测边界一致）：**组件内部几何随 flavor（组件族 token），页面布局间距（业务层 `gap/p-*`）只随 `--app-scale` 不随 flavor**——严禁把全局 `--spacing` 按 flavor 分叉，否则切风格会引发业务页布局漂移。
- 顺序固定：**design.md 值表回填 → tokens.css 实现 → `/dev/theme-states` 矩阵 → snapshot/guard**；值表没有的差异不进 token。
- 密度 token 与 `--app-scale` 是两个乘子叠加，逐档验证不溢出、不跳档。
- 一个维度一切片，不一次性大扫。

验收：

- 三风格下 Card 内距、表格行高、控件高度、字号阶梯呈现档差，且与各自 design.md 值表一致。
- 飞书=高密度清爽、claude=宽松纸面、shadcn=中性克制的密度气质肉眼可辨，不再“只像换色 + 圆角”。
- 验收矩阵为 3 flavor × 3 scale × 明暗。

### 7.6 P2：组件语义类与 token 收敛

按风险从低到高推进：

1. Badge / Progress / Avatar status
2. Dashboard 与 login 页的展示性 primitive class（合计约 27 处，theme-guards baseline 锁定；dashboard 属 CLAUDE.md 标注的待迁移横切遗留——primitive 清理与纵切迁移对齐节奏，建议随迁移一并清，不单独动）
3. Shell widgets：AppearanceDrawer、Nav、UserMenu、SubsystemSwitcher
4. Pro：Pagination、SideList、Tree、TableShell
5. UI：Tabs、Dropdown、Dialog/Sheet、Table

原则：

- 已经 token 化的 Button/Input/Select 不返工，只补缺口。
- 每完成一个组件族，同步 `/dev/theme-states`。
- 每完成一个组件族，加入 `theme-guards` 或 snapshot。

验收：

- 页面层 primitive 状态 class 数量下降。
- 业务页面不再表达通用控件状态。
- 三风格 light/dark 下 Button/Input/Select/Menu/Table 有体系级差异。

### 7.7 P1：风格值表回填（§7.5 实施纪律的第一步，随 Phase 2b 执行，非独立后置阶段）

从官方 registry 展平源码提炼设计值（`/r/styles/base-<style>/<component>.json`；实测无独立 style-*.css 文件，style 差异全在组件 class 层），不直接复制类。注意：§7.5 需要的密度维度（card 内距、表格 cell padding、字号阶梯）当前三份 design.md **没有条目**（只有 spacing 阶梯与控件 height/padding）——补齐这些值表就是本节的活，在 Phase 2b 每个维度切片的第一步完成：

- Nova：紧凑、轻量、后台默认。
- Maia：更圆、更宽松。
- Lyra：硬朗、无圆角、偏工具感。

映射建议：

| 本地 style | 参考来源 | 本地定位 |
| --- | --- | --- |
| `feishu` | Feishu + Nova | 企业后台默认，清爽、高密度 |
| `claude` | Claude + Maia/Luma | 温和、内容感、轻纸面 |
| `shadcn` | shadcn + Lyra/Nova | 工具感、黑白中性、克制 |

验收：

- 每套 style 有 `docs/design/<flavor>.design.md` 值表来源（仓库为三份分文件，无单一 DESIGN.md）。
- 不出现“看起来只是换色”的状态。

### 7.8 P3：第四套风格 sera（机制验收用例，基建完成后启动）

把官方 Sera 移植为第四套 flavor，作为 §7.5/§7.6 基建的**验收用例**：「加一套 Sera 顺不顺、几天能落地」是这套机制好坏的北极星指标。Sera 与现有三套距离最远（editorial 大写风），能吞下它就能吞下任何风格。

差异要素 → 机制落法：

| Sera 要素 | 落法 | 难度 |
| --- | --- | --- |
| 全直角 | `--radius-factor: 0` | 零成本 |
| 按钮 40px 高、px-24、text-xs semibold | 控件高度/字号 token（§7.5） | 填表 |
| 卡片内距 32 + shadow-sm、表格 h-12/p-3 | 组件族密度 token（§7.5） | 填表 |
| 大写 + 字距（按钮/label/badge/表头/卡片标题/分组标题） | `--*-transform`/`--*-tracking` token 束 | 最大的活 |
| 输入框只剩下划线 | 扩展 `.ui-field`：分边 border token + padding token | 一次性改状态机 |
| badge 药丸→裸文字 | 依赖 badge token 化挂点（§7.6） | 依赖前置 |
| slider 方形 thumb | 本仓库无 slider 组件 | 不适用 |
| 值表 | 从 registry 展平源码提炼（2026-07-07 调研已拿到精确值） | 几乎零调研 |

三个设计决策：

1. **uppercase 豁免机制**：Sera 非无脑全大写——checkbox/radio/switch 旁 label 与 FieldDescription 显式 `normal-case`。豁免规则在状态机层写一次，不逐 flavor 重复。
2. **radius 轴失效语义**：factor=0 后用户圆角档无感。参照官方（Sera 下面板 Radius 显示随动为 None），抽屉 UI 是否置灰该档需定。
3. **固定税**：theme-states/snapshot/visual/i18n/design.md/抽屉卡片每处 +1 列——这是加任何风格的成本，接受即做，不接受就不做第四套。

前置依赖：§7.5（几何/密度/排印 token）+ §7.6 关键组件族（badge/card/table/field）挂点完成。**不要在基建前启动**，否则全是一次性 hack。

## 8. 实施阶段

### Phase 0：方案确认

- 本文档评审。
- 明确是否采用 B 方案。
- 明确是否允许后续新增 `DesignSystemPreset` 文件和外观模型测试。

### Phase 1：模型与 Provider，不改视觉

- 新增类型与转换函数。
- 重构 `applyAppearance` 边界，但保持行为不变。
- 补单测和 FOUC 契约测试。
- 文档化 §7.2 官方同步规则（禁 `--overwrite`、diff 基准、`components.json` 旧世代 style 值处置）——必须先于任何动组件的 Phase。

风险低，收益是把后续改造的入口稳定下来。

### Phase 2：Preset 与 AppearanceDrawer

- 外观面板从“单项设置”改成“Preset + Theme + Shell”结构。
- 三个默认 preset 一键应用。
- layout/pageAnim 从视觉 preset 中明确剥离。

风险中，用户可见，但不涉及业务页面。

### Phase 2b：per-flavor 几何/密度/排印 token（§7.5，新增）

- 第 0 切片：视觉矩阵自动化（§6.6 第 4 条）——theme-states 补 scale 选择、visual 脚本解除 flavor 硬编码并遍历 3 flavor × 3 scale × 明暗。
- 逐维度推进：密度/间距 → 字号阶梯/排印 → 控件高度 → ring/阴影 → 形态类（仅有值表依据的）。
- 每个维度走「design.md 值表回填 → tokens.css → theme-states → snapshot/guard」四步。
- 验收矩阵 3 flavor × 3 scale × 明暗。

风险中，这是“切风格呈现体系级差异”的直接来源。

### Phase 3：组件族语义类收敛

- 按组件族切片推进。
- 每个切片必须包含 token、组件、theme-states、guard。
- 优先清理 Shell 和 Pro，再清理业务页面尾巴。

风险中高，需要逐步做，不能一次性大扫。

### Phase 3b：第四套风格 sera（§7.8，机制验收用例）

- 前置：Phase 2b + Phase 3 的关键组件族（badge/card/table/field）完成。
- 产出：`docs/design/sera.design.md` 值表 + `tokens.sera.css` profile + 型分支 + 全矩阵验证。
- 用「落地天数」检验机制：顺 = 基建合格；不顺 = 回头修基建，不硬凑。

风险低（可随时放弃，不影响主线）。

### Phase 4：官方 shadcn registry 工作流

- 前置：§7.2 同步规则已在 Phase 1 文档化；本阶段做工具化与 checklist 深化。
- 建立“官方新增组件接入 checklist”。
- 对官方组件做临时目录 diff，不直接覆盖当前组件。
- 必要时维护本地 registry 或脚本，用于记录本地组件和官方版本的差异。

风险中，主要是流程治理。

### Phase 5：可选的 preset 分享能力

- 如果后续确实需要复制/分享外观，可实现短码。
- 第一版不做 base62，避免把复杂度引进核心路径。

风险低，可延后。

## 9. 验收标准

### 9.1 代码结构

- `appearance` store 仍是唯一运行时外观状态。
- DOM 写入仍有唯一出口。
- `layout/pageAnim/collapsed` 不进入视觉 preset。
- `components/ui`、`components/pro` 不 import `modules`。

### 9.2 样式纪律

- 业务页面只写布局类。
- 通用状态类沉到 UI/Pro。
- 禁止新增 `rounded-[Npx]`。
- 禁止组件内硬编码 hex。
- 禁止用 primitive class 表达通用控件状态。

### 9.3 视觉行为

- Claude / 飞书 / shadcn 三套风格切换后：
  - Button 不只是换色，hover/focus/尺寸/字重/圆角有体系差异。
  - Input/Select 的 border、focus、open 状态有体系差异。
  - Menu/Dropdown 的 highlighted/selected 状态稳定。
  - Table hover/selected/header 有体系差异。
  - Shell nav current/hover 状态稳定。
- 3 flavor × 3 scale（90%/100%/108%）× 明暗矩阵下，弹层定位和尺寸正常；密度 token 与 `--app-scale` 叠乘不溢出。
- 三风格密度/排印差异肉眼可辨：Card 内距、表格行高、控件高度、字号阶梯对照各自 design.md 值表呈现档差。

### 9.4 自动化验证

涉及主题/基础组件/Pro 改造时，必须跑：

```bash
pnpm theme:guard
pnpm design:lint
./node_modules/.bin/tsc -b --noEmit
./node_modules/.bin/eslint src
./node_modules/.bin/vitest run
```

涉及可见 UI 改造时，补：

```bash
pnpm visual
```

## 10. 风险与控制

| 风险 | 影响 | 控制 |
| --- | --- | --- |
| 过度抽象 preset | 写一堆没人用的配置 | 第一阶段只抽现有字段，不新增幻想轴 |
| 误用官方 `apply` 覆盖组件 | 丢失本地 token/scale/variant | 固化 `--dry-run/--diff`，禁止 blind overwrite |
| 页面 className 清理变成大重构 | 影响业务功能 | 按组件族和页面尾巴分批推进 |
| token 数量膨胀 | 维护困难 | 一个组件族不足 3 个真实差异不新增复杂 token |
| runtime semantic class 与 Tailwind 扫描冲突 | 样式丢失 | 语义类写在 `global.css`，不依赖动态拼接 |
| 主题和布局继续耦合 | 外观模型混乱 | layout/pageAnim 永远归 ShellPreference |

## 11. 决策点

需要评审确认：

1. 是否采用推荐 B 方案：本地 `DesignSystemPreset` + 运行时语义类 + 官方 shadcn diff 同步。
2. 是否允许保留 `flavor` 作为用户文案，同时在代码层逐步引入 `style` 概念。
3. Preset 点击时是否覆盖 `accent/radius/scale`。
   - 推荐：覆盖视觉轴，不覆盖 `layout/pageAnim`。
4. 第一阶段是否先不做短码。
   - 推荐：先不做，等 preset 模型稳定后再说。

### 2026-07-07 评审结论（实测审核后）

1. 采纳 B 方案，附两条强制修正：§5.2 机制勘误（style 差异 100% 在组件 class 层、registry 服务端展平、无可复用的官方运行时交付物）；新增 §7.5 per-flavor 几何/密度/排印 P1——不补这块，做完仍“只像换色 + 圆角”。
2. flavor 留作用户概念、代码逐步引入 style：同意；`data-style` 别名不急，纯改名是 churn。
3. preset 点击覆盖视觉轴、不覆盖 layout/pageAnim：同意。实测 /create 行为可作参照：切 style 轴不重置其它轴（radius 的 default 档按 style 解析，Sera 下解析为 0）；我们采用更强的“点击预设=应用完整预设”语义，与“有限预设一键切换”的产品形态一致。
4. 第一阶段不做短码：同意。

## 12. 下一步建议

如果方案通过，下一份应写实施计划，而不是直接开改。计划按以下原子切片拆：

1. `DesignSystemPreset` 类型与转换函数 + §7.2 同步规则文档化。
2. `applyAppearance` 到 `applyDesignSystemPreset` 的兼容重构。
3. AppearanceDrawer 信息架构调整。
4. 视觉矩阵自动化（§6.6 第 4 条，Phase 2b 第 0 切片，验收基建先行）。
5. per-flavor 几何/密度/排印 token 逐维度切片（§7.5，每维度首步为值表回填 §7.7；含 style profile 文件化与 token contract，§6.6）。
6. Shell/Pro 的 semantic class 收敛。
7. 页面尾巴清理与 guard 扩展（dashboard/login 的 primitive 清理与纵切迁移对齐，见 §7.6）。
8. 官方 shadcn registry 工作流工具化。
9. 第四套风格 sera 验收用例（§7.8，基建完成后）。

第一步只做模型和测试，不动视觉，这样风险最低。
