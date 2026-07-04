# 通用后台脚手架主题深化与组件 Token 体系 Spec

- 日期：2026-07-04
- 状态：v3.1（第五轮实地调研 + 第六轮 design.md 生态调研均已回写；三个拍板项已决（§16.6）；设计身份文档 docs/design/*.design.md 已建并通过 lint；当前位置 Step 2R，可开工）
- 范围：主题风格、基础 UI、Pro 组件、页面级样式约束、外观 runtime（accent 轴）、验证体系
- 不在本 spec 范围：业务接口改造、路由重构、权限模型、mock 数据域扩展

> v2 修订说明：第四轮评审对照仓库代码逐条核实了 v1 的事实断言，修正了悬空 token 引用、
> shadcn base 字段来源表述、与现有组件结构冲突的 Tabs token、与现值不符的遮罩值，
> 新增了优先级实现机制（§7.7）、状态选择器映射（§7.8）、accent 管辖权（§4.7）、
> token 值表（§10.2）与测试分层（§12.2），并重排了实施顺序（§11、§17）。

## 1. 背景

当前脚手架已经有 `feishu`、`claude`、`shadcn` 三种界面风格，并通过 `<html data-flavor>`、`data-mode`、`data-radius`、显示比例 token `--app-scale` 与 CSS variables 控制外观。

现有机制解决了基础换肤问题，但主要停留在全局色彩层：

- `--bg` / `--canvas` / `--surface` / `--chrome` / `--surface-2`
- `--text` / `--text-2` / `--text-3` / `--border`
- `--pri` / `--pri-soft`（由外观 runtime 内联注入，见 §5.1）

基础组件内部仍直接消费通用 token，例如：

- `Input` 使用 `bg-surface`、`border-input`、`focus-visible:border-pri`、`ring-soft`
- `SelectTrigger` 使用 `data-[state=open]:border-pri`
- `Button` variants 直接写 `bg-pri`、`hover:border-pri hover:text-pri`
- `Tabs` line 变体 active 态直接使用 `text-pri`、`after:bg-pri`
- `.ui-field:focus-within` 在 `global.css` 里直接使用 `--surface`、`--pri`、`--danger`

这会导致：切换界面风格时，视觉变化主要像"换配色"，不是"切换设计体系"。

**现状修正（第四轮评审实测）**：状态样式散落问题集中在 `components/ui` 与 `components/pro` 层
（宽口径 grep `border-pri|ring-soft|bg-pri|text-pri` 命中约 161 处，最大头是 button.tsx 8 处）；
**页面层不是主战场，但仍有尾巴**：当前 grep 口径下 users 共 5 处命中、其中页面 TSX 2 处；roles 共 10 处命中、其中页面 TSX 6 处。
因此本工程的重心在 ui/pro 层 token 化，页面层清理是小尾巴而非主战场。

## 2. 目标

建立一套能支撑长期演化的主题深化机制，使界面风格不仅改变全局颜色，也能改变组件的
hover、active、focus、open、disabled、invalid、selected、expanded、pressed、highlighted 等状态与弹层形态。

最终目标：

1. 选择一种 `flavor` + 任意合法 `accent` 后，基础 UI、Pro 组件、Shell 组件和页面级组合都能自动吃到完整状态 token。
2. 业务页面不关心主题机制，只组合组件和业务数据。
3. 组件源码不写 `if flavor === 'feishu'` 这类分支。
4. 主题差异集中在 token 层，组件结构集中在 `components/ui` 与 `components/pro`。
5. 后续新增风格时，以新增 token 覆盖 block 为主，不大面积改组件代码。

## 3. 非目标

1. 不引入 Ant Design、Arco Design、Material UI 等完整组件库替换当前组件。
2. 不把 `shadcn` 理解为 npm 黑盒组件库；坚持 shadcn/ui 的 open code 模式。
3. 不引入 CSS-in-JS 主题运行时。
4. 不重写 Select、Dialog、Dropdown、Popover 的焦点管理、键盘导航、aria、outside event、autoFocus、Escape 等基础交互逻辑。
5. 不一次性重写所有业务页面样式。
6. 不把每个页面都做成独立主题适配点。
7. 不用运行时 JS 为每个组件注入状态 token；组件 token 必须主要由 CSS 根据 `html[data-*]` 派生（accent 主色注入是既有例外，见 §4.7）。
8. **不做 flavor 驱动的结构变体**：flavor 只能在同一 DOM 结构内调 token 值；结构差异（line tabs vs segmented tabs、有无阴影层）是组件 API（variant prop），由调用方选择，不随 flavor 自动切换。

## 4. 设计原则

### 4.1 分层依赖矩阵

```text
Primitive Tokens
  -> Semantic Tokens
    -> UI Component State Tokens
      -> Pro Component Tokens
        -> Shell / Page Composition
```

| 层级 | 允许定义 | 允许依赖 | 禁止事项 |
| --- | --- | --- | --- |
| Primitive | 原始色、阴影、圆角、空间、基础品牌色 | 无或自身派生 | 被页面直接用来表达控件状态 |
| Semantic | `background`、`foreground`、`primary`、`muted`、`accent`、`input`、`ring` | Primitive | 带具体组件名，例如 `field`、`button` |
| UI Component State | `--field-border-focus`、`--button-primary-bg-hover` | Semantic / Primitive | 判断 flavor、重写交互逻辑 |
| Pro Component | `--pro-toolbar-bg`、`--side-list-item-bg-active` | UI Component / Semantic | 重新定义 Button/Input/Table 的基础状态 |
| Shell/Nav | `--shell-header-bg`、`--nav-item-bg-current` | UI Component / Semantic | 把导航状态散落到业务页面 |
| Page | 布局、区域组合、业务内容密度 | Pro / UI 组件 | 定义基础控件 hover/focus/active/selected 样式 |

`State Tokens` 不作为独立层存在。`--field-bg-focus` 这种变量本质是"组件状态 token"，必须归属到对应组件族。

### 4.2 组件无 flavor 分支

组件代码只消费 token，不判断当前风格。

错误方向：

```tsx
flavor === 'feishu' ? 'bg-white' : 'bg-zinc-950'
```

正确方向：

```tsx
'bg-(--field-bg) focus-visible:border-(--field-border-focus)'
```

### 4.3 基础逻辑用成熟 primitive

组件交互逻辑继续依赖 shadcn/ui + Radix。我们负责样式、组合、状态 token 和业务组件，不从零实现选择弹层、焦点管理、键盘导航、aria 属性。

当前 shadcn 项目事实必须保留：

- `components.json` 显式记录 `style = new-york`、`rsc = false`、`tailwind.css = src/styles/global.css`
- `pnpm dlx shadcn@latest info --json` 解析出的 `config.base = radix`，这是 Radix primitive API 约束来源；不要误写成 `components.json` 里存在显式 `base` 字段
- Tailwind CSS v4（当前 ^4.3.2）
- `iconLibrary = lucide`
- 依赖统一走 `radix-ui` 聚合包（当前 ^1.6.1）

### 4.4 基础层收敛，页面层克制

页面层只允许表达：布局网格、业务区域顺序、数据驱动的显隐、少量业务专属视觉。

页面层禁止表达：

- Input/Button/Select/Table/Tabs 的通用 hover/focus/active/selected 状态
- Dialog/Sheet close button 的局部样式
- 表格行 hover、表头背景、操作按钮颜色
- 导航项 current/expanded 的基础视觉

**边界判例**：`RolePermissionEditor` 的权限 action chips 选中态（`border-pri bg-pri-soft text-pri`）
属于"业务专属视觉"，页面层可暂留；但它已出现复用倾向，建议后续沉淀为 Pro 层 chip/tag 选中组件（不阻塞本工程）。
判据：该状态样式是否描述"一个通用控件的通用状态"——是则禁止，否则允许但记入沉淀候选。

### 4.5 Token 是契约，不是随手变量

新增 token 必须满足：

1. 名称能表达使用场景。
2. 引用的上游变量必须已定义（由 var() 引用完整性 guard 强制，见 §12.1）。
3. 至少被一个组件消费；**token 随其组件族切片一起落地，禁止先批量落一堆未消费 token**。
4. 有测试或文档说明。
5. 不和已有 token 重叠。
6. 每个组件族首批 token 原则上不超过 24 个；超过必须在 spec 或 PR 说明原因（Button 族因 11 个 variant 获得豁免，见 §9.4）。
7. **同值 token 仅允许作为已确认的差异挂载点**：默认值与另一 token 相同时，值表（§10.2）中必须至少有一个 flavor/mode 覆盖它，否则不建（先合并，未来有差异再拆）。
8. 状态合并规则：当某族的 `focus-visible` / `focus-within` / `open` 三态在所有 flavor 中无差异设计时，合并为单一 `-focus` 后缀 token；拆分需值表证明差异存在。

### 4.6 Token 消费语法统一

- 组件状态 token（`--field-*`、`--button-*` 等）**不进入** `@theme inline`，统一用 Tailwind v4 括号变量语法消费：`bg-(--field-bg)`、`border-(--field-border)`、`text-(--option-fg)`。避免 utility 数量爆炸，也让"哪些类走组件 token"一眼可辨。
- Semantic 层维持现有 `@theme inline` 映射与语义 utility（`bg-surface`、`text-text-3`）。
- 避免 `bg-[var(--token)]` 旧写法；review 判据：出现 `[var(--` 即打回（Tailwind 语法确实无法表达的场景除外，需注释说明）。
- class 全部写成字面量，禁止运行时拼接 token 名（Tailwind 静态扫描的前提）。

### 4.7 accent 与 flavor 的管辖权

外观真实状态空间是 **flavor × mode × accent（5 预设 + 自定义 hex）× zoom × radius** 五轴。
`--pri` / `--pri-soft` 由 `applyAppearance` **内联注入到 `<html>`**（appearance-dom.ts），内联样式压过一切样式表——
因此 flavor CSS block 中的 `--pri` 定义只是 FOUC 兜底，运行时权威永远是 accent 注入。管辖权划分：

| 归属 | 管什么 | 例子 |
| --- | --- | --- |
| accent（runtime 注入） | 主色全家桶及一切链到它的组件 token **值** | `--pri`、`--pri-soft`、`--pri-hover/active`（派生）、`--on-pri`（派生） |
| flavor（CSS block） | 中性色系、阴影、密度、以及组件 token 的"换系"覆盖 | `--surface`、`--border`、shadcn 把 option highlighted 从主色系换成中性系 |
| mode（CSS block） | 明暗两套 primitive 值 + 派生方向 | dark 下 `--pri-hover` 向白混合而非向黑 |

约束：

1. 组件 token 引用 `--pri` 系时，必须接受任意合法 accent 值（含自定义 hex），不得假设"feishu 就是蓝"。
2. §10.2 差异矩阵中凡由 accent 自动带来的差异（主色相关），**不写 flavor 覆盖**；只有换系差异才写。
3. flavor 切换联动默认 accent（现状 `FLAVOR_DEFAULT_ACCENT`）的行为保留。

**Step 1 必须完成的 runtime 改造**（当前实测缺陷）：

1. `ACCENTS` 增加暗色值：至少 `shadcn` 需要 `priDark: '#fafafa'`（现状 `#18181b` 在 dark 背景 `#09090b` 上 primary 按钮几乎不可见）；其余 accent 暗色值可缺省 = 亮色值。
2. `resolveAccentVars` 改为 mode-aware：dark 时优先取 `priDark`。
3. 新增 `--on-pri` 派生并随 `--pri` 一起注入：解析主色后分别计算黑/白前景的 WCAG contrast，选择对比度更高的一方，覆盖自定义 hex 场景；FOUC 持久化补 `_onPriResolved`。`tokens.css` 中 `--on-pri: #ffffff` 降级为兜底。
4. `--pri-hover` / `--pri-active` 派生方向 mode-aware：在 `[data-mode='dark']` 中覆盖为向白混合（`color-mix(in srgb, var(--pri) 85%, white)` 档），避免暗色下浅主色越 hover 越暗。

### 4.8 形态轴：flavor 联动的圆角 / 密度 / 字重默认值（v3 新增）

实地调研（§16.5）证明三个体系的差异一半在"形态"而非颜色：飞书 6px 圆角 + 32px 按钮 + 400 字重，
shadcn 10px 圆角 + 32px 控件 + 500 字重，claude 大圆角 + 描边阴影。纯颜色 token 表达不了这些，故新增形态轴机制：

1. **flavor 携带形态默认值**：`--radius-factor`、控件高度、按钮字重由 flavor block 提供默认值
   （机制现成：`--radius-factor` 已是乘法体系，flavor block 覆盖即可）。
2. **用户轴优先级不变**：用户显式设置的 `data-radius`（sharp/round）仍覆盖 flavor 默认——
   实现方式：flavor 只在用户未显式设置时生效（`html:not([data-radius])[data-flavor='x']` 或 runtime 逻辑择一，实施时定）。
3. **控件高度 token 拆分裁决**：实测飞书按钮 32px / 输入 36px 不同高，现有单一 `--control-md` 表达不了；
   拆 `--control-btn-md` 与 `--control-md`（输入），或按钮族内嵌高度 token，Step 2R 实施时定。
4. **字重**：Button 族补 `--button-font-weight`（feishu/claude 400，shadcn 500）。
5. 本节不改 §3-8 非目标：形态轴是 token 值差异，不是 DOM 结构差异。

### 4.9 DESIGN.md 设计身份层（v3.1 新增）

每个 flavor 配一份 DESIGN.md 设计身份文档（Google Labs design.md 格式：YAML token + prose 设计理由），
位于 `docs/design/{feishu,claude,shadcn}.design.md`。

**层级定位**（不改变现有架构，是 token 链的最上游）：

```text
DESIGN.md（设计身份：值 + 为什么）
  -> §10.2 值表（实施规格）
    -> tokens.css（CSS 实现：五层 token + mode/accent/状态机）
```

约束与用法：

1. DESIGN.md 是**值来源与理由文档**：回答"这个 flavor 为什么长这样"；值表与 tokens.css 的
   flavor 值必须能追溯到对应 DESIGN.md 或 §16.5 实测记录。
2. DESIGN.md **不承载实现机制**：无 mode 维度（dark 映射在 tokens.css）、无状态优先级、
   无 accent 注入逻辑——这些是 §4.7/§7.7 的职责，禁止反向把机制塞进 DESIGN.md。
3. 质检：`npx @google/design.md lint` 校验格式与 WCAG 对比度（guard 见 §12.1-5）；
   token 变更可用 `npx @google/design.md diff` 生成回归报告（服务 §12.4 长期项）。
4. 演进方向（Step 8 文档化）：**新增 flavor = 提供一份 DESIGN.md**——可用
   `npx getdesign add <site>`（getdesign.md 目录 300+ 现成分析）作为起点，
   经"值表落定 → tokens.css flavor block → 浏览器矩阵验证"三步接入。
5. 三份文档与 flavor 值表冲突时，以**实测/lint 证据**为准并回写两处（参照 [[review-report-sync]] 纪律）。
6. **原始数据存档**：三体系的全部采集原始数据（官方规范全表、变量全量 dump、组件实测记录）无损存于
   `docs/design/research/`（目录内 README 即索引）；值表与身份文档的任何值应可追溯到该目录。

## 5. 现状基线

### 5.1 当前 flavor / accent 机制

核心文件：

- `src/styles/tokens.css` — flavor × mode primitive block + 派生 token
- `src/styles/global.css` — `@theme inline` 映射、`.ui-field` 状态钩子、`--app-scale` 盖写
- `src/lib/appearance-dom.ts` — `applyAppearance` 写入 `data-flavor/mode/radius/zoom`，**内联注入 `--pri` / `--pri-soft`**；`ACCENTS` 5 预设 + custom hex；`FLAVOR_DEFAULT_ACCENT` 联动
- `src/stores/appearance.ts`、`src/app/shell/widgets/AppearanceDrawer.tsx`

```ts
type Flavor = 'feishu' | 'claude' | 'shadcn';
```

### 5.2 当前 token 覆盖范围

页面/内容/Chrome 背景、文本层级、边框、主色及浅底、圆角乘法体系（`--radius-factor` × `--app-scale`）、
显示比例、shadow 直方图 token、`--control-border`、`--focus-ring`、`--tooltip-bg`（恒深底特例）。

### 5.3 当前组件状态问题（对照代码核实）

| 组件 | 当前状态写法 | 问题 |
| --- | --- | --- |
| Input / Textarea | `bg-surface` / `focus-visible:border-pri` / `ring-soft` | 状态值不可按 flavor 换系 |
| `.ui-field` 钩子 | `focus-within` 直接用 `--pri`、`--surface`、`--danger` | 全局状态钩子绕过组件 token（但它的"高特异性压 hover"机制是对的，要保留并升级，见 §7.7） |
| SelectTrigger | `data-[state=open]:border-pri` | open/focus 状态值不可换系（注：三 flavor 均无 open≠focus 的差异设计，两态合并为 `-focus`，见 §4.5-8） |
| SelectItem | `focus:bg-pri-soft focus:text-pri`、`data-[state=checked]:*` | highlighted/selected 绑死主色系 |
| DropdownMenuItem | `focus:bg-accent focus:text-accent-foreground` | 与 SelectItem 语义不同（命令 vs 选择），迁移时不得强行统一成主色系；`--accent` 语义在本切片前不得改动 |
| Button | 11 个 variant 直接写 `bg-pri`、`hover:border-pri hover:text-pri` 等 | secondary/outline hover 是"边框+文字同变主色"，token 集必须能表达 fg-hover |
| Tabs | 双结构变体：default（segmented，active 是 `bg-surface text-text`）与 line（active 是 `text-pri` + `after:bg-pri`） | 单一 token 集无法同时服务两种结构，必须按变体分维（§9.5） |
| Dialog / Sheet | 遮罩现值 `bg-[rgba(0,0,0,0.22)] backdrop-blur-[6px]`（arbitrary class）；close button 局部 class | 遮罩值和模糊量要 token 化且忠实现值；close 未抽象 |
| Table | 表头 `[&_tr]:bg-surface-2`；行 hover 值迁移时核对 | 状态耦合 |
| Checkbox | **自写 native input**（`:checked` 伪类 + indeterminate 条件 class） | 不能假设 Radix `data-state` |
| RadioGroup / Switch | **Radix 实现**（`data-[state=checked]`） | 与 Checkbox 的选择器不同源，映射表见 §7.8 |

## 6. 目标架构

### 6.1 总体结构

```text
src/styles/
  tokens.css
    1. flavor primitive/semantic tokens（现有 block）
    2. global derived tokens（现有）
    3. ui component state tokens（随族切片新增，含 flavor 覆盖 block）
    4. pro/shell component tokens

  global.css
    1. Tailwind @theme inline mapping（semantic 层，不收组件 token）
    2. base reset
    3. 组件状态机钩子（§7.7 模式，消费组件 token）
    4. animation keyframes

src/components/ui/    -> 消费 ui component state tokens
src/components/pro/   -> 组合 ui 组件 + 消费 pro tokens
src/app/shell/        -> 消费 shell/nav tokens + ui 组件
src/modules/*/pages/  -> 组合 pro/ui 组件
```

### 6.2 组件族清单

第一批组件族（token 定义随各自切片落地，见 §11）：

- **Field**：Input、Textarea、SelectTrigger、NativeSelect（兼容路径）、Field、Form、InputGroup、SearchField
- **Option / Menu**：SelectItem（选择语义）与 DropdownMenuItem（命令语义）**分开建 token**，后续 Combobox/Command item 归入 option
- **Button**：Button 全部 variants、IconButton 用法、close button
- **Tabs**：ui Tabs（segmented + line 双变体）、AnimatedTabs（line 系）
- **Overlay**：Dialog、Sheet、Popover、DropdownMenu content、SelectContent（Tooltip 恒深底为豁免特例）
- **Table**：Table、TableShell、Pagination
- **Choice**：Checkbox（native）、RadioGroup（Radix）、Switch（Radix）
- **Skeleton / Empty**：仅这两个有独立 token 价值；Badge/Alert/Progress/StatusBadge 直接消费既有语义 status token（`--success/--warning/--danger/--info` 及 `*-bg`），**不建 feedback 别名层**——flavor 想降低状态色饱和度，直接在 flavor block 覆盖语义 status 色即可
- **Pro / Shell**：PageScaffold、TableShell、SearchField、SideList、Pagination、AppearanceDrawer、GlobalSearch、NavMenu/Sidebar

## 7. Token 命名规范

### 7.1 命名格式

```text
--<scope>-<part>-<property>-<state>
```

允许简化（part/state 可省）：`--field-bg`、`--field-border-focus`、`--button-primary-bg-hover`、`--option-bg-selected`。

### 7.2 scope 清单

第一阶段允许的 scope：

`field`、`option`、`menu`、`button`、`tabs`、`overlay`、`table`、`choice`、`switch`、
`skeleton`、`empty`、`nav`、`shell`、`side-list`、`pro`

**overlay 收敛规则**：Dialog/Sheet/Popover/Dropdown/SelectContent 的共性（surface、border、shadow、mask、close）
一律用 `overlay`；仅当某弹层出现专属差异且值表证明需要时，才允许 `dialog`/`sheet`/`popover` 专属 scope（当前不开放）。

### 7.3 property 清单

`bg`、`fg`、`border`、`ring`、`shadow`、`radius`、`height`、`padding-x`、`padding-y`、
`indicator`、`icon`、`placeholder`、`check`、`thumb`、`mask`、`blur`

### 7.4 state 清单

无后缀即 base（不写 `-base`）。优先使用：

`hover`、`active`、`focus`（合并态，见 §4.5-8）、`focus-visible`、`focus-within`、`open`、
`highlighted`、`selected`、`checked`、`indeterminate`、`expanded`、`pressed`、`current`、
`disabled`、`readonly`、`invalid`、`loading`、`sorted`

状态含义：

- `focus`：族内 focus-visible / focus-within / open 无差异设计时的合并态。
- `highlighted`：Radix Select/Menu/Command 当前键盘或指针高亮项。
- `current`：导航或面包屑当前项。
- `pressed`：toggle 类按钮按下态。
- `expanded`：树、菜单、表格行展开态。
- `sorted`：表头当前排序列（token 随排序功能实际落地时补，本期只保留命名位）。

### 7.5 状态优先级合同

```text
disabled / loading
  > invalid
  > open / focus
  > checked / selected / expanded / pressed / current / highlighted
  > active
  > hover
  > base
```

约束：

1. disabled/loading 必须压过所有交互态。
2. invalid 必须压过 focus/open，但保留可访问性 ring（invalid ring 换 danger 系，不消失）。
3. open/focus 必须压过 hover。
4. selected 与 highlighted 同时存在时必须可读（文字与背景对比达标）。
5. 禁止用 `!important` 解决优先级，除非补测试并在 PR 说明。

### 7.6 禁止命名

禁止视觉色名：`--field-blue-border`、`--button-gray-hover`。
禁止产品名污染：`--feishu-input-focus`、`--claude-button-bg`。flavor 定义 token 值，不进入 token 名。

### 7.7 状态优先级实现机制（本 spec 的执行核心）

**问题**：token 化后 `hover:border-(--field-border-hover)` 与 `data-[state=open]:border-(--field-border-focus)`
特异性相同，胜负取决于 Tailwind 生成 CSS 的变体顺序——不受源码 class 顺序控制，不可依赖
（global.css 现有注释已实证过 hover utility 顺序晚于 focus-within utility 的情况）。

**机制裁决**：

1. **单轴状态**（同一时刻互斥、无压制关系，如 Button 的 hover/active/disabled）：
   可以继续用 Tailwind 变体消费 token（`hover:bg-(--button-primary-bg-hover)`），
   disabled 用 `disabled:pointer-events-none` 物理隔离交互态。
2. **凡涉及 §7.5 的跨状态压制合同**（open 压 hover、invalid 压 focus、多状态可同时成立）：
   必须走 **"单消费点 + 状态重赋值"状态机钩子**，禁止依赖变体生成顺序。

状态机钩子模式（Field 族示意，落在 global.css，声明顺序即优先级）：

```css
/* 组件只消费"当前值"中间 token（--_field-*），状态由钩子按声明顺序重赋值。
   同特异性下后声明者胜 → 本块书写顺序就是 §7.5 合同的物理载体。 */
.ui-field {
  --_field-bg: var(--field-bg);
  --_field-border: var(--field-border);
  --_field-ring-color: transparent;
  background: var(--_field-bg);
  border-color: var(--_field-border);
  box-shadow: 0 0 0 var(--focus-ring) var(--_field-ring-color), var(--field-shadow);
}
/* 低 → 高依次声明 */
.ui-field:hover { --_field-border: var(--field-border-hover); }
.ui-field:focus-within,
.ui-field:focus-visible,
.ui-field[data-state='open'] {
  --_field-bg: var(--field-bg-focus);
  --_field-border: var(--field-border-focus);
  --_field-ring-color: var(--field-ring-focus);
}
.ui-field[aria-invalid='true'],
.ui-field[data-status='error'] {
  --_field-border: var(--field-border-invalid);
}
.ui-field[aria-invalid='true']:focus-within,
.ui-field[aria-invalid='true']:focus-visible,
.ui-field[data-status='error']:focus-within {
  --_field-ring-color: var(--field-ring-invalid);
}
.ui-field:disabled,
.ui-field[data-disabled='true'] {
  --_field-bg: var(--field-bg-disabled);
}
```

说明：

- 此模式是现有 `.ui-field` 钩子的正式化升级，不是新发明；迁移 = 把钩子里的 `--pri/--surface/--danger`
  换成 `--field-*` 并补全状态分支。
- 中间 token（`--_field-*` 下划线前缀）不属于公共契约，不进值表、不许组件外消费。
- readonly、placeholder 等无压制冲突的状态仍可用 Tailwind 变体。
- **优先级合同的验证只认浏览器 computed style 断言**（§12.2），jsdom 单测不得声称覆盖此项。

### 7.8 状态 → 选择器映射合同

不同实现源的同一抽象状态，选择器不同。实现时按此表写，禁止自行发挥：

| 抽象状态 | 选择器 | 适用组件 |
| --- | --- | --- |
| hover | `hover:` | **仅自写非 Radix 交互元素**（Button、SideList 项、GlobalSearch 结果项）；Radix 弹层选项不写 hover（指针移动已被 Radix 归一为 highlighted） |
| highlighted | `focus:`（与现状一致；Radix 把键盘/指针高亮统一落到 item focus） | SelectItem、DropdownMenuItem |
| checked | `data-[state=checked]:` | Radix：RadioGroup、Switch、SelectItem |
| checked | 原生 `:checked`（Tailwind `checked:`） | Checkbox（native input） |
| indeterminate | prop 条件 class（现状实现） | Checkbox |
| open | `data-[state=open]:` | SelectTrigger、DropdownMenuTrigger、可折叠容器 |
| invalid | 控件 `aria-invalid:` + 容器 `data-invalid`（Field 合同，两者必须同步） | Field 族 |
| disabled | 原生 `disabled:`；非表单元素 `data-[disabled]:`；Radix item `data-[disabled]:` | 全部 |
| current | `aria-current="page"` / data-active | Nav、面包屑 |
| expanded | `aria-expanded` / `data-[state=open]` | 树、可展开行 |
| pressed | `aria-pressed` / `data-[state=on]:` | toggle 类 |

推论：`--option-bg-hover` 之类的 token **不存在**（Radix 系无独立 hover 态）；自写列表的 hover 用各自族 token。

## 8. shadcn / Radix 硬约束

1. Radix `Trigger`、`Close` 使用自定义子元素时必须用 `asChild`，不得包额外无语义 `div`。
2. Dialog/Sheet 必须保留 `DialogTitle`/`SheetTitle`；视觉隐藏时用 `sr-only`。
3. `DialogContent` 当前通过自定义 `onPointerDownOutside` / `onInteractOutside` 阻止 outside click 关闭父弹窗（dialog.tsx 已实现），该行为必须保留，尤其要覆盖"Dialog 内 Select 打开后点击其他表单控件不误关父 Dialog"。
4. Overlay 不改 Portal、Content、Trigger、outside event、autoFocus、Escape 行为；只改 class/token。
5. Portal token 必须定义在 `:root` 或 `html[data-*]`，不能挂在 app 子树（Radix Portal 脱离组件原 DOM；`--app-scale` 同理已验证可继承）。
6. Select/Popover/Dropdown/Tooltip 必须保留 Radix CSS variables，例如 `--radix-select-trigger-width`、`--radix-select-content-available-height`、`--radix-select-content-transform-origin`。
7. Portal 弹层动画必须继续基于 `data-state`、`data-side`、`data-align`。
8. `SelectItem` 必须在 `SelectGroup` 内；`DropdownMenuItem`、`DropdownMenuLabel`、`DropdownMenuSub` 应在 `DropdownMenuGroup` 体系内组织。
9. 表单布局优先 `FieldGroup` + `Field`；校验态必须同时具备 `Field data-invalid` 与控件 `aria-invalid`。
10. Button 不新增 `isLoading` / `isPending` API，继续使用现有 `loading` / `ButtonSpinner`。
11. Button、菜单、输入组里的图标使用 `data-icon`，由组件统一控尺寸。
12. Checkbox 是自写 native input，不是 Radix Checkbox；RadioGroup 与 Switch 是 Radix。选择器按 §7.8 映射表写。

## 9. 各层级设计方案

> 各族 token 默认值以**现组件 class 实值**为忠实基线（评审已逐文件核对 input/select/button/tabs/checkbox/
> switch/radio/dialog/sheet；table/skeleton/empty 标注"迁移时核对"）。标 ⚠ 的为提案值，切片时浏览器视觉定稿。
> **所有 token 引用的上游变量必须已存在于 tokens.css / 注入合同中**，由 var() 引用完整性 guard 强制（§12.1）。

### 9.1 Primitive / Semantic 层 + accent runtime（Step 1）

1. 三 flavor 均已有完整 light/dark primitive block（含在途新增的 shadcn block，Step 0 盘点入基线）。
2. 完成 §4.7 的四项 runtime 改造（ACCENTS 暗色值、mode-aware resolve、`--on-pri` 对比度派生注入、dark 派生方向翻转）。
3. `global.css` 中 shadcn semantic 映射的硬编码 foreground（`--color-primary-foreground: #ffffff`、`--color-destructive-foreground: #ffffff`）收敛到 `var(--on-pri)` / `var(--on-danger)`。
4. `global.css` 低层状态钩子升级为 §7.7 状态机（随 Field 切片实施）。
5. `--pri` / `--pri-soft` / `--on-pri` 组件不得直接消费来表达具体组件状态；一律经组件 token 中转。

### 9.2 Field Family（Step 2）

范围：`input.tsx`、`textarea.tsx`、`native-select.tsx`、`select.tsx` 的 trigger、`field.tsx`、`form.tsx`、`SearchField.tsx`、InputGroup 系列。NativeSelect 是兼容路径，不作为主 Select 体验。

第一批 token（16 个；focus-visible/focus-within/open 按 §4.5-8 合并为 `-focus`）：

```css
:root {
  --field-bg: var(--surface);
  --field-fg: var(--text);
  --field-placeholder: var(--text-3);
  --field-icon: var(--text-3);
  --field-border: var(--border);
  --field-shadow: var(--shadow-card-sm);

  --field-border-hover: var(--control-border);

  --field-bg-focus: var(--surface);          /* 挂载点：claude light 提案见 §10.2 */
  --field-border-focus: var(--pri);
  --field-ring-focus: var(--soft);

  --field-border-invalid: var(--danger);
  --field-ring-invalid: var(--danger-bg);

  --field-bg-disabled: var(--surface-2);
  --field-bg-readonly: var(--surface-2);

  --field-addon-bg: var(--surface-2);
  --field-addon-fg: var(--text-3);
}
```

验收重点：

- 三 flavor 下 base/hover/focus/invalid/disabled/readonly 可区分且符合值表。
- focus/open 态压过 hover 态；invalid 压过 focus/open（浏览器 computed style 断言）。
- Select open 态和 Input focus 态视觉一致。
- `Field data-invalid` 与控件 `aria-invalid` 同步。
- 点击 Select 弹层外部控件不误关父 Dialog。

### 9.3 Option / Menu Family（Step 5）

范围：`select.tsx` item、`dropdown-menu.tsx` item、后续 Combobox/Command（预留不实现）、`LanguageMenu`/`UserMenu` 可迁移菜单项。

选择语义与命令语义分开（现状两者视觉本就不同，强行统一会造成回归）：

```css
:root {
  /* 选择语义（SelectItem）：现状 focus:bg-pri-soft focus:text-pri / checked 同系加粗 */
  --option-fg: var(--text);
  --option-fg-muted: var(--text-3);
  --option-bg-highlighted: var(--pri-soft);
  --option-fg-highlighted: var(--pri);
  --option-bg-selected: var(--pri-soft);
  --option-fg-selected: var(--pri);
  --option-check: var(--pri);

  /* 命令语义（DropdownMenuItem）：现状 focus:bg-accent（=surface-2）中性系 */
  --menu-item-fg: var(--text);
  --menu-item-bg-highlighted: var(--surface-2);
  --menu-item-fg-highlighted: var(--text);
  --menu-item-fg-danger: var(--danger);
  --menu-item-bg-danger-highlighted: var(--danger-bg); /* ⚠ 现状 destructive/10，迁移时视觉对齐 */
}
```

要求：

1. `hover` 不建 token（§7.8 推论）；highlighted 用 `focus:` 选择器。
2. selected 与 highlighted 同时存在时保证可读。
3. `SelectGroup` / `DropdownMenuGroup` 组合约束写入组件和示例。
4. **`--accent` 语义裁决在本切片完成**：DropdownMenuItem 迁到 `--menu-item-*` 后，`--accent` 不再被组件状态消费，可安全调整语义；在此之前禁止改动（未迁移组件会漂移）。

### 9.4 Button Family（Step 3）

范围：`button.tsx` 全部 11 个 variant、Dialog/Sheet close button、Header icon button、Table action button、AppearanceDrawer segment button。

**上游前置**：`--danger-hover`、`--on-danger` 当前不存在，本切片先在 tokens.css 定义再引用：

```css
:root {
  --danger-hover: color-mix(in srgb, var(--danger) 90%, transparent); /* 忠实现状 bg-danger/90 */
  --on-danger: #ffffff;
}
```

第一批 token（27 个，超 24 预算说明：Button 族承载 11 个 variant，是被引用最广的族）：

```css
:root {
  --button-primary-bg: var(--pri);
  --button-primary-bg-hover: var(--pri-hover);
  --button-primary-bg-active: var(--pri-active);
  --button-primary-fg: var(--on-pri);

  /* secondary 与 outline 现状同值，共用一组；现状 hover = 边框+文字同变主色 */
  --button-secondary-bg: var(--surface);
  --button-secondary-bg-hover: var(--surface);          /* 挂载点：shadcn 覆盖见 §10.2 */
  --button-secondary-bg-active: var(--surface-2);
  --button-secondary-fg: var(--text);
  --button-secondary-fg-hover: var(--pri);
  --button-secondary-border: var(--border);
  --button-secondary-border-hover: var(--pri);
  --button-secondary-shadow: var(--shadow-card-sm);

  --button-dashed-fg: var(--text-2);
  --button-dashed-fg-hover: var(--pri);
  --button-dashed-border: var(--line-strong);
  --button-dashed-border-hover: var(--pri);

  --button-text-fg: var(--pri);
  --button-text-bg-hover: var(--pri-soft);
  --button-link-fg: var(--pri);

  --button-ghost-fg: var(--text-2);
  --button-ghost-fg-hover: var(--text);
  --button-ghost-bg-hover: var(--surface-2);

  --button-danger-bg: var(--danger);
  --button-danger-bg-hover: var(--danger-hover);
  --button-danger-fg: var(--on-danger);
  --button-danger-ring: var(--danger-bg);
  --button-danger-ghost-fg: var(--danger);
  --button-danger-ghost-bg: var(--danger-bg);
  --button-danger-ghost-border: var(--danger);

  --button-icon-fg: var(--text-3);
  --button-icon-fg-hover: var(--text);
  --button-icon-bg-hover: var(--surface-2);
  --button-ring: var(--soft);
}
```

要求：

1. close button、Header icon button 统一走 `--button-icon-*`（Overlay 切片依赖此组，故 Button 先行）。
2. 可点击元素 `cursor-pointer`，disabled `cursor-not-allowed`（现有 global.css 兜底保留）。
3. loading 态保留 `ButtonSpinner` 组合，不引入 `isPending` prop。
4. danger 和 destructive 同值同迁，不允许只迁一个；`link` 的 underline 是结构不是 token。
5. hover/active/disabled 属单轴状态，允许 Tailwind 变体消费（§7.7-1）。

### 9.5 Tabs Family（Step 6）

范围：`tabs.tsx`（双结构变体）、`AnimatedTabs.tsx`（自写 line 系 tablist，需单独验收键盘导航和 aria）。

**按结构变体分维**（单一 token 集无法同时服务 segmented 与 line，v1 的合并写法作废）：

```css
:root {
  /* segmented（ui Tabs default 变体）：现状 active = bg-surface + text-text + shadow-card-sm */
  --tabs-seg-list-bg: var(--surface-2);
  --tabs-seg-trigger-fg: var(--text-3);
  --tabs-seg-trigger-fg-hover: var(--text);
  --tabs-seg-trigger-bg-active: var(--surface);
  --tabs-seg-trigger-fg-active: var(--text);
  --tabs-seg-trigger-shadow-active: var(--shadow-card-sm);

  /* line（ui Tabs line 变体 + AnimatedTabs）：现状 active = text-pri + 主色指示条 */
  --tabs-line-border: var(--border);
  --tabs-line-trigger-fg: var(--text-2);   /* ⚠ 对齐项：ui line 现为 text-3、AnimatedTabs 为 text-2，统一为 text-2，迁移时视觉确认 */
  --tabs-line-trigger-fg-hover: var(--text);
  --tabs-line-trigger-fg-active: var(--pri);
  --tabs-line-indicator: var(--pri);

  --tabs-ring: var(--soft);
}
```

要求：

1. 结构变体由调用方通过 `variant` prop 选择，flavor 不切换结构（§3-8）。
2. line 指示条动画保留且不抖动；指示条颜色走 `--tabs-line-indicator`。
3. active、hover、focus-visible 三态不互相覆盖错乱；tab hover `cursor-pointer`，disabled 除外。

### 9.6 Overlay Family（Step 4）

范围：Dialog、Sheet、Popover、DropdownMenu content、SelectContent。

**豁免特例**：Tooltip 恒深底白字（`--tooltip-bg: #1f2329`，明暗不反转，原型合同），不消费 `--overlay-bg`，保持现状。

第一批 token（默认值忠实现状；v1 的 mask 0.42 是想象值，实测为 0.22）：

```css
:root {
  --overlay-mask-bg: rgba(0, 0, 0, 0.22);   /* 现状 bg-[rgba(0,0,0,0.22)]，迁移时顺手消灭 arbitrary class */
  --overlay-mask-blur: 6px;                 /* 现状 backdrop-blur-[6px]；模糊量不乘 --app-scale */
  --overlay-bg: var(--surface);
  --overlay-fg: var(--text);
  --overlay-border: var(--border);
  --overlay-shadow-modal: var(--shadow-modal);
  --overlay-shadow-popover: var(--shadow-popover);
  --overlay-close-fg: var(--button-icon-fg);          /* 依赖 Step 3 Button 切片先行 */
  --overlay-close-fg-hover: var(--button-icon-fg-hover);
  --overlay-close-bg-hover: var(--button-icon-bg-hover);
}
```

要求：

1. Dialog / Sheet close button 视觉统一（消费 `--overlay-close-*` → `--button-icon-*`）。
2. 弹层内 Select 点击其他表单控件不误关父 Dialog（§8-3 合同 + 浏览器验证）。
3. popover/dropdown/select content 的阴影、圆角、边框走 overlay token。
4. 短期保留现有 `z-50`，中期收敛 overlay stack token；本切片不改层级。
5. 必须保留 Radix CSS variables 和 `data-state/data-side/data-align` 动画钩子。
6. 已知待办（不阻塞）：`--shadow-drawer` 现值只适配右侧抽屉，Sheet 支持多 side 时需按 `data-side` 派生方向。

### 9.7 Table Family（Step 7）

范围：`table.tsx`、`TableShell.tsx`、用户/角色/菜单业务表格。

```css
:root {
  --table-bg: var(--surface);
  --table-border: var(--border);
  --table-header-bg: var(--surface-2);      /* 现状 [&_tr]:bg-surface-2 */
  --table-header-fg: var(--text-3);         /* ⚠ 迁移时以 table.tsx 现值核对 */
  --table-row-bg: var(--surface);
  --table-row-bg-hover: var(--surface-2);   /* ⚠ 迁移时以 table.tsx 现值核对 */
  --table-row-bg-selected: var(--pri-soft);
  --table-row-bg-expanded: var(--surface-2);
  --table-row-fg: var(--text);
  --table-action-fg: var(--pri);
}
```

要求：

1. 表头样式全局收敛，不允许页面单独手写。
2. 表格操作按钮优先 `Button variant="link/text"` 或 Pro action 组件。
3. Pro 层不得定义 `--pro-table-*` 覆盖 Table 基础状态。
4. `sorted` 状态 token 随排序功能落地时补（§7.4）。
5. 密度差异（行高/内边距按 flavor 变化）**本期不做**——v1 矩阵中"feishu 表格密度较高"的承诺超出颜色 token 的表达能力，删除；若未来要做，走 `--table-row-height` 类尺寸 token 单独立项。

### 9.8 Choice Family（Step 6）

范围：Checkbox（native）、RadioGroup（Radix）、Switch（Radix）。选择器按 §7.8：Checkbox 用 `checked:`/条件 class，Radio/Switch 用 `data-[state=checked]:`。

```css
:root {
  --choice-bg: var(--surface);
  --choice-border: var(--control-border);
  --choice-border-hover: var(--pri);
  --choice-bg-checked: var(--pri);
  --choice-border-checked: var(--pri);
  --choice-fg-checked: var(--on-pri);
  --choice-bg-indeterminate: var(--pri-soft);
  --choice-border-indeterminate: var(--pri);
  --choice-fg-indeterminate: var(--pri);
  --choice-bg-disabled: var(--surface-2);
  --choice-ring: var(--soft);

  --switch-bg: var(--control-border);        /* 现状 unchecked */
  --switch-bg-checked: var(--pri);
  --switch-thumb-bg: var(--surface);
}
```

要求：

1. checkbox/radio/switch 的 focus ring 统一走 `--choice-ring`。
2. checked、indeterminate、disabled 可区分。
3. Radio 的 aria-invalid 分支沿用 Field 系 danger token。

### 9.9 Skeleton / Empty（Step 6）

```css
:root {
  --skeleton-bg: var(--surface-2);   /* ⚠ 迁移时以 skeleton.tsx 现值核对 */
  --empty-fg: var(--text-3);         /* ⚠ 迁移时以 empty.tsx 现值核对 */
}
```

Badge/Alert/Progress/StatusBadge 直接消费语义 status token（§6.2），本族不建别名。
要求：skeleton 不沿用按钮 loading 视觉；Empty 不写死灰色 hex；dark mode 可读。

### 9.10 Pro / Shell / Page Layer（Step 7）

范围：PageScaffold、TableShell、SearchField、SideList、Pagination、AppearanceDrawer、GlobalSearch、Header icon buttons、NavMenu/Sidebar、页面工具栏/筛选区/详情面板。

```css
:root {
  --pro-page-bg: var(--bg);
  --pro-panel-bg: var(--surface);
  --pro-panel-border: var(--border);
  --pro-toolbar-bg: var(--surface);
  --pro-filter-bg: var(--surface);
  --side-list-bg: var(--surface);
  --side-list-border: var(--border);
  --side-list-item-bg-hover: var(--surface-2);
  --side-list-item-bg-active: var(--pri-soft);
  --side-list-item-fg-active: var(--pri);
  --shell-header-bg: var(--chrome);
  --nav-item-bg-current: var(--pri-soft);
  --nav-item-fg-current: var(--pri);
}
```

要求：

1. Pro token 只表达业务组合容器，不重新定义基础控件状态。
2. AppearanceDrawer 的 segment 按钮、GlobalSearch 的结果项 hover 分别走 button/side-list 系 token。
3. 页面级自定义只处理布局差异；用户、角色、菜单三条业务线作为样板验证（实测遗留量小，见 §1）。

## 10. Flavor 差异策略

### 10.1 差异从哪里来（三个来源，勿混淆）

1. **primitive 差异（已有，自动生效）**：三 flavor 的中性色/明暗 block 不同，一切链到 `--surface/--border/--text` 的组件 token 自动跟随。
2. **accent 差异（runtime 注入，自动生效）**：flavor 联动默认 accent（feishu 蓝 / claude 陶土 / shadcn 黑白），一切链到 `--pri` 系的组件 token 自动跟随。**v1 差异矩阵里"蓝 / 陶土橙 / 黑白"的描述全部属于此类，不需要任何 flavor 覆盖。**
3. **换系差异（需要 flavor 覆盖 block，本 spec 的真正增量）**：某 flavor 把某状态从主色系换成中性系（或调整阴影档），才写 `[data-flavor='x']` 覆盖。

### 10.2 Token 值表 v3（实测锚定版）

> v3 变更：值表不再是"提案值"，而是 2026-07-04 对三个体系真实站点的**实地采集值**
> （ui.shadcn.com 组件页 / admin.feishu.cn 管理后台（登录态）/ claude.com + claude.ai 应用，
> 全部 computed style 实测，采集记录见 §16.5）。定位从"三种配色氛围"升级为"还原三个体系的真实质感"。
> 标注【待补采】的单元格是本轮没采到的，实施对应切片前先补采再定值，禁止拍脑袋。

**三体系 Field 核心模式（实测）**：

| 维度 | feishu（admin.feishu.cn） | claude（claude.ai / claude.com） | shadcn（ui.shadcn.com） |
| --- | --- | --- | --- |
| base 底色 | **灰底 `#F2F3F5`** | 白底 | **透明**（透出页面底） |
| base 边框 | 同底色（无边框感） | 1px hairline 暖边 `#E6DFD8`（表单控件，getdesign 值）；**描边阴影文化**（`0 0 0 0.5px rgba(31,31,30,.15)` + `0 4px 20px rgba(0,0,0,.035)` 柔浮）用于卡片/弹层 | 1px `#e4e4e7` |
| focus 变化 | **灰底→白底反转** + 1px `#3370FF` 蓝边，**无 ring** | 边框转陶土 + **3px 陶土色 15% 透明外环**（getdesign 值，v3.1 填补） | 边框变中灰（≈zinc-500）+ **3px 半透明晕染 ring（ring 色 50% 透明）**，边框不变主色 |
| 圆角 | 6px | 输入容器 20px / 常规控件 8-12px | 10px |
| 控件高 | 输入 36px / 按钮 32px | 36-40px | **32px** |

**Field 族 token 值（按上表落）**：

| token | feishu（=默认） | claude 覆盖 | shadcn 覆盖 |
| --- | --- | --- | --- |
| --field-bg | **var(--surface-2)**（灰底；v2 的白底与真实飞书不符） | var(--surface) | transparent |
| --field-bg-focus | var(--surface)（白，反转） | var(--surface) | transparent |
| --field-border | **var(--surface-2)**（同底色隐形边，保占位防跳动） | var(--border)（hairline 暖边；描边阴影文化归 Overlay/卡片，不用于表单输入） | var(--border) |
| --field-border-focus | var(--pri) | var(--pri)（陶土） | **var(--control-border)**（中灰，非主色） |
| --field-ring-focus | **transparent（飞书无 ring）** | color-mix(in srgb, var(--pri) 15%, transparent)（getdesign 值） | color-mix(in srgb, var(--text-3) 50%, transparent) |
| --field-shadow | none | none（表单输入无阴影；0.5px 描边+柔浮链用于 Overlay 切片） | none |
| 其余 | §9.2 默认值 | — | — |

**形态轴（§4.8 机制，flavor 默认值）**：

| 轴 | feishu | claude | shadcn |
| --- | --- | --- | --- |
| --radius-factor flavor 默认 | 0.75（6px 档） | 1.0（控件 8px/卡片 12px 恰为现基准档；大容器 16px 走专属 token） | 1.25（10px 档） |
| 按钮高（--control-btn-md，拟拆分） | **32px** | 36px | **32px** |
| 输入高（--control-md） | 36px | 36px | 32px |
| 按钮字重 | **400** | 400 | 500 |
| 表格密度 | 紧凑（行 ≈28-32px；表头透明底、14px/400，【待补采】完整值） | 常规 | 常规 |

**Primitive 修正（实测 vs 现值）**：

| token | 现值 | 实测应为 |
| --- | --- | --- |
| claude light --bg | `#f0eee6` | **`#FAF9F5`**（claude.com body；应用内为 `#F8F8F6`，二选一定稿） |
| ACCENTS claude pri | `#c96442` | **`#cc785c`**（getdesign 专业分析值；soft `#f8ede7` 恰与现值一致不用改）。`--pri-active` 派生结果与官方 `#a9583e` 对比确认 |
| claude 标题字体 | 无衬线 | 衬线栈 `Cormorant Garamond, Georgia, Songti SC, serif`（**已决：引入**，仅页面标题层，见 §16.6） |

**Button 族关键值（实测）**：

| 维度 | feishu | claude | shadcn |
| --- | --- | --- | --- |
| 主按钮 bg | `#3370FF` ✓ 现状即对 | **陶土 `#cc785c`（已决，见 §16.6）**：getdesign 专业分析确认 coral 是签名 CTA（营销站导航深色按钮与之并存）；白字 on coral 3.28:1 低于 AA 是 Anthropic 官方取舍，本项目跟随，大段文字禁用该组合 | 纯黑 ✓ |
| 主按钮圆角 | 6px | 8px | 10px |
| secondary hover | 【待补采】 | — | bg 变 `#f4f4f5`，边框不变主色 |

**Option / Menu 族**（沿用 v2 推导，Step 5 实施前按三站点补采 highlighted/selected 实测值再定稿）：

| token | 默认 | claude 覆盖 | shadcn 覆盖 |
| --- | --- | --- | --- |
| --option-bg-highlighted / fg-highlighted | var(--pri-soft) / var(--pri) | — | var(--surface-2) / var(--text) |
| --option-bg-selected / fg-selected | var(--pri-soft) / var(--pri) | — | var(--surface-2) / var(--text)（靠 check 图标区分） |

**其余族**（Tabs/Overlay/Table/Choice/Skeleton）：各切片实施前按 §16.5 的采集方法先对三站点补采，
再落值表；若整族无差异则记"无覆盖"一行——这本身就是有效结论。

### 10.3 值表纪律

1. 值表是差异矩阵的唯一形态，禁止再写"暖白 / 低对比 / 接近官方"这类不可执行的形容词描述。
2. 值表单元格必须实测锚定（§16.5 采集方法）；【待补采】单元格在对应切片动手前补采，禁止凭描述推测落值。最终观感仍由人对三 flavor 截图确认。
3. 同值 token 的存在依据就是本表的覆盖列（§4.5-7）：覆盖列全空的同值 token 应删除。

## 11. 实施计划

> 顺序依据：机制先行 → 用户痛点最大的 Field 先做垂直闭环 → Button 先于 Overlay（`--overlay-close-*`
> 依赖 `--button-icon-*`，跨族依赖显式化）→ Option/Menu 承载 `--accent` 裁决 → 其余族收敛。
> **每个切片 = token 定义 + 组件消费 + flavor 值表确认 + 浏览器验证，四位一体交付**；禁止 token 先行批量落地。

### Step 0：冻结 spec 与在途改动盘点

- 本 spec v2 定稿；风险清单、任务拆分。
- 实施前确认当前分支与工作区状态。当前主题基线已提交为 `73c1492 收敛组件主题基线`；本 spec 是该 checkpoint 之后的方案修订，后续实施应单独提交，避免污染回滚点。

验收：spec 覆盖层级、机制、值表、验证与影响范围；四轮审查的 P0/P1 已回写。

### Step 1：机制与守护（不落组件 token）

改动范围：`appearance-dom.ts` 及其测试、`stores/appearance.ts`、`tokens.css`（runtime 相关派生）、`global.css`（semantic foreground 收敛）、guard 脚本/测试、`/dev/theme-states` 页面骨架。

任务：

1. §4.7 四项 accent runtime 改造（ACCENTS 暗色值、mode-aware resolve、`--on-pri` 派生注入 + FOUC、dark 派生方向翻转）。
2. 新增 **var() 引用完整性 guard**（§12.1-2）。
3. 新增 **违规 class 基线 guard**（§12.1-3，baseline JSON + 词边界正则）。
4. `--color-primary-foreground` / `--color-destructive-foreground` 硬编码收敛到 `var(--on-pri)` / `var(--on-danger)`（`--on-danger` 此时一并定义）。
5. 建 `/dev/theme-states` 页面骨架（空壳 + flavor/mode/accent 切换器），后续每族切片往里加该族状态矩阵——它是每个切片浏览器验证的统一载体。

验收：shadcn flavor + dark mode 下 primary 按钮可见可读；自定义亮色 accent 下按钮文字可读；两个 guard 进 CI 且能红。

### Step 2：Field Family 纵向切片

改动范围：§9.2 范围文件 + `global.css` 状态机钩子 + 对应测试。

任务：

1. 落地 `--field-*` token 与 §10.2 Field 值表（⚠ 值视觉定稿）。
2. `.ui-field` 钩子升级为 §7.7 状态机（invalid/focus/open/hover/disabled 全分支）。
3. 组件改为消费 field token；`Field data-invalid` 与 `aria-invalid` 合同化。
4. SearchField icon 的显式 size/text class 收敛到组件约束。
5. `/dev/theme-states` 加 Field 状态矩阵；用户管理、菜单管理表单弹窗人工验证。

验收：三 flavor 状态可区分；优先级合同浏览器 computed style 断言通过；Dialog 内 Select 交互不退化。

### Step 3：Button Family 切片

改动范围：`button.tsx`、tokens.css（`--danger-hover`/`--on-danger` 前置定义）、Shell/Header icon button、Table action button 使用点。

任务：11 个 variant 全部消费 `--button-*`；icon 系 token 落地（供 Step 4）；danger/destructive 同迁；cursor 合同保持。

验收：各 variant × 三 flavor × 明暗合理；disabled/loading 压过 hover/active；违规基线中 button.tsx 清零。

### Step 4：Overlay Family 切片

改动范围：`dialog.tsx`、`sheet.tsx`、`popover.tsx`、`dropdown-menu.tsx` content、`select.tsx` content。

任务：mask/surface/border/shadow/close token 化（忠实 0.22 + blur 6px 现值）；close button 统一走 `--overlay-close-*`；Portal/outside event/autoFocus/Escape/Radix CSS variables 不动。

验收：关闭按钮统一；菜单管理弹窗内嵌套弹层不误关父级；Radix 动画与定位不退化。

### Step 5：Option / Menu Family 切片

改动范围：`select.tsx` item/group、`dropdown-menu.tsx` item、LanguageMenu/UserMenu 可迁移项。

任务：`--option-*` 与 `--menu-item-*` 分开落地；highlighted 用 `focus:` 选择器（§7.8）；完成 `--accent` 语义裁决（迁移完成后 `--accent` 才允许调整）。

验收：Select 三态清晰、selected+highlighted 可读；DropdownMenu 无视觉漂移；shadcn flavor 换系覆盖生效。

### Step 6：Tabs / Choice / Skeleton-Empty 切片

改动范围：`tabs.tsx`、`AnimatedTabs.tsx`、`checkbox.tsx`、`radio-group.tsx`、`switch.tsx`、`skeleton.tsx`、`empty.tsx`。

任务：Tabs 按 seg/line 分维 token 化（两个结构变体分别验收）；Choice 按 §7.8 三种选择器源迁移；AnimatedTabs 单独验证 keyboard/aria；line 指示条动画保留。

验收：segmented active 不被染主色（v1 token 集的回归点）；指示条动画不抖动；Checkbox/Radio/Switch 状态清晰；dark mode 可读。

### Step 7：Table / Pro / Shell / 样板页面切片

改动范围：`table.tsx`、`TableShell.tsx`、`PageScaffold.tsx`、`SideList.tsx`、`Pagination.tsx`、`AppearanceDrawer.tsx`、`GlobalSearch.tsx`、用户/角色/菜单页面残留清理（实测量小）。

任务：表头/行状态 token 化（现值核对）；Pro/Shell token 落地；roles 页 16 处残留按 §4.4 判例分流（迁移或标记为业务专属）。

验收：三条样板线不再手写基础控件状态；违规基线整体清零或余量全部有判例标注。

### Step 8：约束与文档固化

改动范围：`docs/frontend-architecture-guide.md`、`docs/architecture.md`、`AGENTS.md`、guard 脚本转正、`/dev/theme-states` 完善。

任务：新增组件 token 流程、页面层禁止事项、值表维护规则写入文档；guard 进 CI 阻断；主题验收 checklist；状态展示页补齐全部族。

验收：文档能指导新人新增组件；CI 能发现 token 违规与悬空引用；状态页可产出完整截图矩阵。

## 12. 验证方案

### 12.1 静态守护（确定性脚本，进 CI）

1. **token 快照**：现有 `tokens.snapshot.test.ts` 字面量断言模式，扩展覆盖新增 token 与 flavor 覆盖 block。
2. **var() 引用完整性 guard（新增）**：解析 `tokens.css` + `global.css` 收集全部自定义属性定义名；
   扫描两文件内所有无 fallback 的 `var(--x)` 引用，以及组件源码中 `(--token)` 括号语法引用的 token 名；
   引用未定义即 fail。白名单：`--radix-*`（运行时注入）、`--_*`（状态机中间 token，只查 global.css 内定义）。
   本 guard 直接封杀 v1 曾出现的 `var(--danger-hover)` 悬空引用类缺陷。
3. **违规 class 基线 guard（新增）**：baseline JSON 记录 `file → 命中数`；
   正则必须带词边界防前缀碰撞（如 `(?<![\w-])border-pri(?![\w-])` 避免误伤 `border-pri-soft`）；
   模式集：`border-pri`、`ring-soft`、`bg-pri`、`bg-pri-soft`、`text-pri`、`focus-visible:border-pri`；
   新增命中 fail；某文件清零后从 baseline 删除该文件（棘轮收紧）。
4. 沿用既有铁律：组件内禁十六进制（ESLint 已拦 .tsx）、禁 `rounded-[Npx]`、`--app-scale` 乘法不破坏；
   `tokens.css` 允许原始色值；`appearance-dom.ts` 数据色值允许但不得写入组件 class。
5. **DESIGN.md lint guard（v3.1 新增）**：`npx @google/design.md lint docs/design/*.design.md`，
   0 errors 为过线；warnings 按白名单过滤（disabled 态对比度属 WCAG 豁免、transparent 底为工具噪声、
   白字 on 飞书蓝/claude coral 为官方真实取舍已记录在案），白名单之外的新 warning 需处理或说明。
   接入方式：Step 2R 先手动跑通，Step 8 进 CI。

### 12.2 测试分层（断言类型 → 形态，不得错配）

| 断言内容 | 形态 | 工具 |
| --- | --- | --- |
| token 定义存在 / 字面值 / var() 引用完整性 | 静态文本 / 脚本 | vitest 读文件 |
| 组件 class 含 token 消费、props/aria 合同 | DOM 单测 | vitest + RTL |
| **状态优先级最终生效**（invalid 压 focus、open 压 hover） | **computed style 断言** | Agent Browser / Playwright |
| Radix 行为合同（outside click、Portal、键盘、Escape、`--radix-*` 变量存在） | 浏览器交互 | Agent Browser / Playwright |
| 三 flavor × mode × accent 视觉 | 截图矩阵 | `pnpm visual` |

**jsdom 不解析外部 CSS 文件**——凡涉及级联胜负、token 真实生效的断言，不得声称由单测覆盖。

### 12.3 浏览器验证矩阵

```text
flavor: feishu / claude / shadcn
mode:   light / dark
accent: flavor 默认 + green（非默认预设）+ custom（亮色，如 #f5c518，验证 on-pri 派生）
scale:  90% / 100% / 108%
radius: sharp / default / round
```

accent 轴为 v2 新增（v1 缺失整轴）；全组合爆炸不现实，最小集：三 flavor × 两 mode 全跑默认 accent，
Field/Button 两族加跑 green + custom 亮色，scale/radius 在 feishu light 全跑、其余抽查。

关键页面：登录页、用户管理、角色管理、菜单管理、外观设置抽屉、`/dev/theme-states`。

关键交互：Input focus/hover/invalid、SearchField focus、Select open/highlighted/selected/outside click、
Dialog 内嵌 Select、Tabs 双变体切换动画、Table row hover/selected/expanded、Dialog/Sheet close hover/focus、
Checkbox checked/indeterminate/disabled、Switch/Radio checked、Button loading/disabled/danger。

### 12.4 视觉验证

- 短期：`/dev/theme-states` 人工截图三 flavor 关键状态；保留 before/after。
- 中期：Agent Browser / Playwright 触发状态保存截图 + 关键元素 computed style 断言。
- 长期：接入视觉回归 diff；token 变化生成审查报告。

### 12.5 样板业务线验证

- 用户管理：部门侧栏 active/hover、tabs、筛选区 field/select/button、表格 header/row、批量操作条、三类弹窗。
- 角色管理：角色列表 active、权限树 checked/indeterminate/expanded、action chips（§4.4 判例）、成员/日志 empty/loading。
- 菜单管理：子系统卡片、树表 expanded/selected、类型 badge、可见性 switch、表单弹窗、嵌套选择弹层。

## 13. 影响范围

### 13.1 高影响

`src/styles/tokens.css`、`src/styles/global.css`、`src/lib/appearance-dom.ts`（accent runtime 改造升级为高影响）、
`src/components/ui/*`、`src/components/pro/*`、guard 脚本、`src/styles/__tests__/*`、`src/components/**/__tests__/*`。

### 13.2 中影响

`src/stores/appearance.ts`、`src/app/shell/widgets/AppearanceDrawer.tsx`、`GlobalSearch.tsx`、
`src/modules/admin/pages/{users,roles,menus}/*`、`index.html` FOUC 脚本（`_onPriResolved`）。

### 13.3 低影响

locale 文案、architecture docs、module boundary tests。

### 13.4 风险

| 风险 | 等级 | 处理方式 |
| --- | --- | --- |
| 状态优先级实现各写各的 | 高 | §7.7 机制裁决 + computed style 断言（v2 新增） |
| accent 轴与组件 token 冲突（自定义色不可读、shadcn dark 不可见） | 高 | §4.7 runtime 改造 + 矩阵加 accent 轴（v2 新增） |
| token 悬空引用 | 高 | var() 引用完整性 guard（v2 新增） |
| token 数量失控 | 高 | 按族预算 24 + 同值挂载点纪律（§4.5-7）+ token 随切片落地 |
| Pro 组件与 UI token 边界模糊 | 高 | Pro token 只表达业务组合，不重定义基础控件状态 |
| Radix 事件合同被样式改造破坏 | 高 | §8 硬约束 + 浏览器行为验证 |
| `--accent` 语义调整造成未迁移组件漂移 | 高 | 裁决锁定在 Step 5，迁移完成前禁改 |
| Portal token 继承失败 | 高 | token 定义在 `:root` / `html[data-*]`（§8-5） |
| 值表提案值未经视觉确认直接落地 | 中 | §10.3 纪律：⚠ 值必须人工浏览器确认 |
| Tabs 结构变体被 token 集误伤 | 中 | §9.5 按 seg/line 分维（v2 修正） |
| class 可读性下降 | 中 | 重复 class 收敛到 cva / helper 常量 |
| 三 flavor 差异维护成本 | 中 | 只允许 token 差异；结构变体归组件 API（§3-8） |
| shadcn 上游更新难合并 | 中 | 保留 open code，更新用 shadcn CLI diff，不 overwrite |

## 14. 完成定义

1. 三 flavor 完整基础状态 token，§10.2 值表全部定稿（无遗留【待补采】/【待拍板】）。
2. Field、Option/Menu、Button、Tabs、Overlay、Table、Choice、Skeleton/Empty、Pro/Shell 族均 token 化。
3. 用户、角色、菜单三条样板线不再手写基础控件状态样式（残留有 §4.4 判例标注）。
4. 状态优先级合同有**浏览器 computed style** 验证覆盖（不接受 jsdom 替代）。
5. Dialog/Select/Popover 等 Radix 行为无退化（浏览器验证）。
6. 两个新 guard（var() 完整性、违规基线）进 CI 且基线棘轮生效。
7. `pnpm vitest run`、`./node_modules/.bin/tsc -b --noEmit`、`./node_modules/.bin/eslint src` 通过。
8. §12.3 浏览器矩阵（含 accent 轴最小集）完成。
9. 文档更新完成。

## 15. 实施纪律

1. 每个切片单独提交，不混改；token 随族落地，禁止批量预落。
2. 每个切片先补 token + guard/测试，再改组件；值表 ⚠ 值先视觉定稿再 commit。
3. 不允许因为某个页面不好看就在页面里堆 class。
4. 不允许把组件逻辑从 Radix/shadcn 改成自写。
5. 不允许用 `!important` 解决状态优先级（例外需说明 + 测试）。
6. 不允许 CSS `zoom`；不允许生产组件写十六进制色值。
7. 不允许在业务页面新增基础控件视觉状态逻辑。
8. 不允许跳过样板业务线验证。
9. 不允许把 shadcn 官方结构当黑盒覆盖；改动必须可 diff、可回滚。
10. 优先级压制合同一律走 §7.7 状态机，禁止依赖 Tailwind 变体生成顺序。

## 16. 对抗性审查记录

### 16.1 架构可维护性审查（第一轮）

结论：方向可行，但初稿分层不够可执行。已吸收：分层依赖矩阵、`State Tokens` 不作为独立层、
`.ui-field` 钩子前置迁移、违规基线 guard、Pro/UI Table token 去重、Shell/Nav 层、token 数量预算、
静态 grep 范围修正（tokens.css 允许原始色值）。

### 16.2 shadcn / Radix 组件约束审查（第二轮）

结论：token 化不冲突，但必须硬性保护 Radix 结构、Portal、事件和 CSS variables。已吸收：
§8 硬约束章节、DialogContent outside click 保留、Portal token 位置、Radix CSS variables 与
data-state/side/align 保留、Field 族纳入 field/form、Button variants 补齐、Checkbox native 标注、
`bg-(--token)` 优先、`--accent` 谨慎处理。

### 16.3 视觉与验证审查（第三轮）

结论：初稿视觉策略不够可验收。已吸收：状态优先级合同、状态清单扩展、差异矩阵、
`/dev/theme-states` 建议、浏览器矩阵扩展（flavor/mode/scale/radius）、样板业务线细化。

### 16.4 代码实况对抗评审（第四轮，2026-07-04，v2 依据）

结论：v1 方向正确但存在 5 个 P0 —— 对照仓库代码逐条核实后修订为本 v2。已吸收：

- **P0** 状态优先级只有清单没有机制 → 新增 §7.7"单消费点 + 状态重赋值"状态机裁决；优先级验证改为只认浏览器 computed style（§12.2）。
- **P0** `var(--danger-hover)` / `var(--danger-foreground)` 悬空引用 → §9.4 前置定义 `--danger-hover`/`--on-danger`；新增 var() 引用完整性 guard（§12.1-2）。
- **P0** accent 轴整体缺失（`--pri` 内联注入压过 flavor CSS；shadcn+dark primary 不可见；`--on-pri` 需 accent-aware） → 新增 §4.7 管辖权 + Step 1 runtime 改造；矩阵加 accent 轴（§12.3）。
- **P0** Tabs 单一 token 集与现有 seg/line 双结构变体冲突 → §9.5 按变体分维；§3-8 裁决"结构变体归组件 API，flavor 只调值"。
- **P0** 差异矩阵文学化不可执行 → §10.2 token 值表替代，⚠ 提案值须视觉定稿（§10.3）。
- **P1** Button token 表覆盖不全且默认值与现状冲突（缺 fg-hover、dashed、danger-ghost） → §9.4 按 11 个 variant 忠实重建。
- **P1** Step 1 批量落 token 与 §4.5-7 自相矛盾 → token 随族切片落地（§11 总则）。
- **P1** Overlay 依赖 Button icon token 的跨族顺序 bug → Button（Step 3）先于 Overlay（Step 4）。
- **P1** highlighted/hover 选择器映射缺失、`--option-bg-hover` 是死 token → 新增 §7.8 映射表并删除该 token。
- **P1** 测试分层错配（jsdom 测不了级联） → §12.2 分层表 + DoD-4 改写。
- **P1** `base = radix` 来源写错为 `components.json` 显式字段 → §4.3 改为以 shadcn CLI resolved config 为准。
- **P1** 消费语法策略未定 → §4.6 组件 token 不进 @theme、统一括号语法。
- **P1** guard 只有策略无形态、正则前缀碰撞 → §12.1 baseline JSON + 词边界正则。
- **P2** feedback 别名层过度工程 → 裁撤，仅留 skeleton/empty（§6.2、§9.9）。
- **P2** 遮罩值 0.42 与现值 0.22 不符 → §9.6 忠实现值 + blur token。
- **P2** 表密度承诺超出 token 表达能力 → 删除，留 §9.7-5 立项口。
- **P2** 页面层散落程度被高估（users 0 处 / roles 16 处） → §1 现状修正 + §4.4 chips 判例。
- 流程：spec 修订与实现提交边界必须清楚 → Step 0 明确当前基线 commit，后续实施单独提交。

### 16.5 三体系实地调研（第五轮，2026-07-04，v3 值表依据）

背景：Step 1/2 完成后用户验收反馈"三 flavor 仍像换配色，不是换设计体系"。第五轮改为**实地采集**：
用 Agent Browser 抓取三个体系真实站点的 computed style（base + focus 双态），替换 v2 的推测提案值。

采集源与方法：

- **shadcn**：ui.shadcn.com 组件文档页（input/button demo，base 与 radix 两条组件线都采）。
- **feishu**：admin.feishu.cn 管理后台（真实登录态，企业概览 + 成员与部门页；`ud__input` 组件 focus 前后对比）。
- **claude**：claude.com 营销站 + claude.ai 应用内（composer 容器阴影链、body/侧栏底色、CTA 按钮）。
  claude.ai/login 有 Cloudflare 挑战，headless 不可达，须用 `--auto-connect` 复用真实 Chrome 登录态。
- 方法注意：背景色带 transition，focus/blur 后须等待 ≥400ms 再读 computed style，否则读到过渡起点值。

核心发现（详值见 §10.2 v3）：

1. 三体系差异的本体是**五个机制轴**：focus 表达（ring 晕染 vs 边框变色 vs 底色反转）、边框形态（实边框 vs
   描边阴影 vs 无边框感）、圆角档、密度（控件高/行高/字重）、阴影文化——颜色只是最表层。
2. 其中 focus/边框/底色/阴影四轴现有 token 机制即可表达（值层面修正）；圆角/密度/字重需新增 §4.8 形态轴。
3. 推翻 v2 的两个想当然：feishu 输入框真身是灰底无边框（v2 写白底灰边）；~~claude 主按钮真身是近黑~~（本条第六轮撤回：近黑是导航按钮的以偏概全，签名 CTA 是陶土 coral，见 §16.6）。
4. 教训沉淀：**值表必须实测锚定，"合理推断"在设计体系还原上不可靠**——v2 的 ⚠ 提案值三处有两处方向性错误。

~~待拍板（阻塞 Step 2R 对应单元格）~~ **三项均已于第六轮决出（2026-07-04，依据见 §16.6）**：

- claude 主按钮：~~近黑还是陶土？~~ → **陶土 `#cc785c`**（getdesign 专业分析确认 coral 是签名 CTA，推翻第五轮"近黑"判断——营销站导航深色按钮与 coral CTA 并存，coral 才是主按钮语义）。
- claude 标题衬线：→ **引入**，栈 `Cormorant Garamond, Georgia, Songti SC, serif`，仅页面标题层，Step 2R 落地时截图确认中文效果。
- 表格密度：→ **feishu 收紧**，Step 7 补采完整值后落密度 token。

### 16.6 design.md 生态调研与拍板落定（第六轮，2026-07-04，v3.1 依据）

背景：用户提供 getdesign.md 与 github.com/google-labs-code/design.md（Google Labs，24.7k★），
要求评估复用价值。调研结论与动作：

- **两项目分工**：design.md 是 DESIGN.md 格式规范（YAML token + prose 理由）+ lint/diff CLI；
  getdesign.md 是 300+ 真实站点的 DESIGN.md 分析目录（含 Claude，无飞书）。
- **交叉验证**：`npx getdesign add claude` 拉取的专业分析与第五轮实测互证——canvas `#faf9f5`
  分毫不差、hairline/圆角层级一致；并填补了实测缺口（text-input focus = coral 边 + 15% alpha
  3px 外环；字体替代栈 Copernicus→Cormorant Garamond/EB Garamond；精确色板 primary `#cc785c`）。
- **定位裁决**：DESIGN.md 是"设计身份/意图层"，token 模型无 mode 维度、无状态优先级机制，
  **不能替代** tokens.css 五层架构；作为上游值来源 + 理由文档 + 质检工具接入。
- **落地物**：`docs/design/{feishu,claude,shadcn}.design.md` 三份设计身份文档已建
  （feishu 用 admin 实测数据自写，为全网独家；三份均通过 `npx @google/design.md lint`，0 errors）。
- **lint 作为第四 guard**（§12.1-5）：WCAG 对比度自动检查。已知白名单：disabled 态（WCAG 豁免）、
  transparent 底（工具噪声）、白字 on 品牌色（飞书蓝 4.28:1 / claude coral 3.28:1，均为官方真实取舍，如实记录）。
- **产品方向（Step 8 文档化）**："新增 flavor = 提供一份 DESIGN.md"工作流——用户可
  `npx getdesign add <site>` 拿现成分析接入第 4 种风格。
- 拍板依据：claude 主按钮取 coral 的证据链 = getdesign 专业分析（签名 CTA）+ 用户原型本就取陶土系
  （ACCENTS claude 现值 #c96442）+ 应用内 accent 一致性；第五轮"近黑"判断系营销站导航按钮的以偏概全，撤回。

## 17. 实施顺序（v3 修订）

```text
Step 0   冻结 + 在途改动盘点入基线                       ✅ 已完成（commit 73c1492）
Step 1   机制与守护（accent runtime、两个 guard、状态页骨架）✅ 已完成（commit 2d3fcea）
Step 2   Field Family 纵向闭环（状态机钩子落地）           ✅ 已完成（commit c097346，值为 v2 提案值）
Step 2R  Field 值表重定值 + 形态轴机制（§4.8）落地          ← 当前位置（拍板已清，可开工）
         任务清单：
         1. --field-* 按 §10.2 值表重写（值来源：docs/design/*.design.md 三份身份文档）
         2. 形态轴：radius-factor / 控件高（含按钮 32px 拆分裁决）/ 按钮字重 flavor 联动
         3. ACCENTS claude 精确值 #c96442 → #cc785c；--pri-active 派生 vs 官方 #a9583e 对比确认
         4. claude 衬线标题 token（仅页面标题层，Cormorant Garamond/Georgia/宋体栈）+ 截图确认
         5. claude light --bg #f0eee6 → #FAF9F5 档（与应用 #F8F8F6 二选一，截图定稿）
         6. 修 AppearanceDrawer.test jsdom ResizeObserver 红灯（vitest 必须全绿）
         7. 手动跑通 DESIGN.md lint guard（§12.1-5）
         验收：/dev/theme-states 三 flavor 并排截图——三体系必须呈现机制级差异
         （飞书灰底反转无 ring / claude 暖纸衬线陶土晕染 / shadcn 透明底中灰晕染），不再是换色
Step 3   Button Family（含 v3 实测值 + 字重 token；icon token 供 Step 4）
Step 4   Overlay Family（Dialog 嵌套合同 + close 统一）
Step 5   Option / Menu Family（--accent 语义裁决；实施前补采三站点选项态）
Step 6   Tabs（seg/line 分维）/ Choice / Skeleton-Empty（实施前补采）
Step 7   Table / Pro / Shell / 样板页面收敛（含表格密度拍板结果）
Step 8   文档 + guard 转正 + 状态页补齐
```

每个后续切片的纪律追加一条：**动手前先按 §16.5 方法补采该族三站点实测值**，值表没有实测锚定的单元格不许写代码。
