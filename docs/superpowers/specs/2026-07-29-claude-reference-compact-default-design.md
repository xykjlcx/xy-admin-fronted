# Claude Design 视觉感知全面对齐与工程融合设计

日期：2026-07-30

状态：已批准实施（v2，2026-07-30）

范围：`frontend/` 全部生产页面、Shell、主题系统、UI/Pro 组件和视觉门禁

视觉真相源：`/Users/ocean/Desktop/claude 做的打单系统原型-供参考/project/打单系统.dc.html`

工程真相源：当前代码、`docs/architecture.md`、根目录 `CLAUDE.md`

## 1. 决策摘要

本项目采用“Claude Design 负责视觉感知，MetaBuilder 负责工程底座”的融合方案。

Claude Design 原型不再只是密度参考，而是以下视觉维度的主基准：

- 字体比例、字重、行高和主次层级；
- 顶栏、Sidebar Header、侧栏宽度、导航行高和图标比例；
- 表格表头、正文、Checkbox、状态标签和分页；
- 搜索、筛选栏、下拉浮层、批量操作和按钮；
- 列表页、详情页和概览页的信息密度；
- 卡片、边框、分割线、圆角、阴影和中性色层级；
- 同屏信息量与整体视觉节奏。

MetaBuilder 保留并继续强化：

- React、TanStack Router / Query / Table 的工程架构；
- `routes → modules → components/pro → components/ui` 的依赖方向；
- token、theme flavor、明暗模式、显示比例、圆角和导航布局切换；
- i18n、权限声明、运行时 API 契约、mock 隔离和纵切模块；
- Radix/shadcn 的交互、键盘、焦点、Portal 和无障碍能力；
- `/dev/theme-states`、架构守卫、视觉矩阵和生产构建门禁。

最终目标不是复刻 Claude Design 的源码，而是让用户在正常使用时首先感受到 Claude Design 的比例与秩序，同时让开发者继续获得 MetaBuilder 的工程能力。

## 2. 第一性原理

后台界面的目标不是“元素越小越好”，而是：

> 在不降低辨识、操作和维护性的前提下，让每一个屏幕像素承载更多任务相关信息。

所有视觉决策必须同时满足四个约束：

1. **信息密度**：减少无业务价值的留白和装饰，同屏展示更多有效记录与上下文；
2. **视觉层级**：标题、正文、标签、元信息、状态和动作仍能快速区分；
3. **交互质量**：视觉尺寸可以更轻巧，但点击热区、键盘、焦点和错误恢复不能退化；
4. **工程复用**：规则必须沉到 token、UI 或 Pro，业务页面只负责业务组合和布局。

不满足这四项的“缩小”不属于本方案。

## 3. 现状判断

### 3.1 视觉问题不是单一字号问题

当前系统的放大感来自多个层级叠加：

- 56px 顶栏；
- 232px 侧栏；
- 28px 页面水平内距和 20px 垂直内距；
- 24px 默认 Card 内距；
- 48px 表头；
- 42px 一级导航；
- 过高的 KPI 卡片；
- 详情页把单个属性拆成大卡片；
- 页面中存在重复背景、边框、圆角和彩色图标底座。

单独把正文从 14px 改成 13px不能解决问题。

### 3.2 当前用户列表不是健康终态

用户列表只是在当前系统内部相对紧凑。对照 Claude Design，它仍存在：

- Shell、Sidebar Header 和导航比例偏大；
- 表头、筛选、Checkbox 与字体基线不统一；
- 中性色层级偏重或偏灰；
- PageSurface 卡片感过强；
- 侧树与主表的密度语言不完全一致。

因此用户列表只作为迁移时的行为基线，不作为视觉基线。

### 3.3 详情页是重点改造对象

Claude Design 详情页属于“记录工作台”：

- 标题、状态和动作在同一条记录头部；
- 基础信息按多列平铺；
- 关联方信息使用紧凑双栏；
- 明细、历史、费用和轨迹连续展开；
- 高价值状态与动作进入右侧工作栏。

当前尾程详情页属于“卡片陈列”：

- 标题区过高；
- 单属性卡片占据大面积首屏；
- Tabs 和内容区有重复留白；
- 右侧工作上下文缺失；
- 首屏只展示少量信息。

详情页不能只改 token，必须同时调整信息架构。

## 4. 方案比较

### 4.1 采用：视觉契约翻译

先把 Claude Design 的比例翻译成受治理的 token 与组件契约，再按页面类型迁移全部生产页面。

优点：

- 视觉对齐能跨页面持续生效；
- 保留现有主题、布局和工程架构；
- 可通过守卫和视觉矩阵防止回退；
- 后续项目复用时不需要重新调一遍 CSS。

### 4.2 不采用：逐页仿写

逐页截图复刻短期变化快，但会重新产生业务页面视觉类、重复结构和风格漂移。

### 4.3 不采用：全局缩放或默认 90%

全局缩放会同时缩小交互热区、浮层和文字，不能解决详情信息架构、卡片层级和颜色关系。

### 4.4 暂不采用：运行时密度开关

本阶段只建立一个高质量紧凑默认，不增加第二条密度轴。`--app-scale` 继续负责 90% / 100% / 108% 用户显示比例。

## 5. 全面对齐边界

### 5.1 必须忠实对齐

- Shell 的几何比例；
- 页面留白和区块节奏；
- 字体角色与视觉层级；
- 表格、筛选、Checkbox、状态标签和分页；
- 详情工作台的信息组织；
- KPI 与概览信息密度；
- 中性色、边界和阴影的视觉强度；
- 同一视口下的有效信息量。

### 5.2 保留 MetaBuilder 的能力

- 多 flavor、明暗模式、圆角和主题色；
- Sidebar、Inset、Rail 三种导航布局；
- 90% / 100% / 108% 显示比例；
- 现有路由、数据流、权限、i18n、mock 和业务行为；
- UI/Pro 分层及 Radix 交互语义。

### 5.3 主动优于参考原型

以下内容不照抄 Claude Design：

- 低对比弱灰；
- 只靠颜色表达状态；
- 不明确的焦点状态；
- 过小的真实点击热区；
- 单视口才能成立的硬编码布局；
- 缺失的 loading、empty、error、disabled、invalid 状态。

## 6. 统一视觉架构

### 6.1 flavor 只改变气质，不改变密度

Feishu、Claude、Shadcn、Sera 必须共享：

- Shell 高度和宽度；
- 页面内距；
- 导航行高；
- 输入、按钮和筛选几何；
- 表头、表格行、单元格内距；
- Card、Metric、详情区块的结构尺寸；
- 字体角色和基础字号。

flavor 允许改变：

- 主色和状态色；
- 中性色的色相倾向；
- 圆角系数；
- 阴影风格；
- display 字体；
- 合理范围内的字重和字距气质。

现有 `tokens.claude.css`、`tokens.shadcn.css`、`tokens.sera.css` 中的表格行高、表头高度、Card spacing、field padding 等密度覆盖需要移除或迁回共享基线。

### 6.2 显示比例保持独立

- `--app-scale` 语义不变；
- 100% 是本规格的主设计尺寸；
- 90% 和 108% 在主尺寸上等比变化；
- 禁止 CSS `zoom`；
- 禁止把 flavor 当密度开关；
- 禁止通过业务页面局部缩放模拟紧凑。

### 6.3 token 层级

```text
Primitive / Semantic Colors
        ↓
UI Component State Tokens
        ↓
Pro Pattern Tokens
        ↓
Shell / Page Composition Tokens
        ↓
Module Layout
```

共享几何进入 `tokens.base.css`；flavor 文件只保留允许的风格差异。组件只消费 token，不判断 flavor。

### 6.4 几何 token 映射

| token | 100% 目标 | 主要消费者 | 守卫 |
| --- | ---: | --- | --- |
| `--shell-header-h` | 52px | ShellHeader、Inset Header、main offset | Shell token snapshot |
| `--shell-sidebar-w` | 200px | SidebarLayout | Shell token snapshot |
| `--shell-sidebar-collapsed-w` | 60px | SidebarLayout | Shell token snapshot |
| `--nav-item-h` | 36px | 一级导航 | Nav component test |
| `--nav-subitem-h` | 34px | 二级导航 | Nav component test |
| `--nav-icon-size` | 16px | Sidebar / Rail / Inset nav | Nav component test |
| `--page-frame-px` | 22px | PageFrame | PageScaffold snapshot |
| `--page-frame-py` | 16px | PageFrame | PageScaffold snapshot |
| `--table-header-h` | 38px | `ui/table`、DataTable | Table token snapshot |
| `--table-row-h` | 44px | `ui/table`、DataTable | Table token snapshot |
| `--table-cell-px` | 12px | TableHead、TableCell | Table token snapshot |
| `--choice-size` | 14px | Checkbox、Radio | Choice state test |
| `--card-spacing` | 16px | 默认 Card | Card token snapshot |
| `--card-spacing-compact` | 14px | compact Card / Pro Section | Card variant test |
| `--card-spacing-comfortable` | 24px | form / print Card | Card variant test |
| `--metric-min-h` | 96px | Pro Metric | Metric test |
| `--metric-spacing` | 14px | Pro Metric | Metric test |
| `--detail-aside-w` | 296px | DetailWorkspace | Detail layout test |

新增 token 必须有实际消费者；禁止先批量种入未使用变量。

## 7. 100% 显示比例视觉契约

所有尺寸允许浏览器渲染产生 ±1px 误差。

### 7.1 排版角色

| 角色 | 字号 / 行高 | 字重 | 用途 |
| --- | --- | --- | --- |
| 页面标题 | 20 / 28px | 600–650 | 列表、详情主标题 |
| 记录标题 | 18 / 26px | 600–650 | 订单号、运单号、对象名称 |
| 区块标题 | 14 / 20px | 600 | 卡片、详情 Section、表格分组 |
| 正文 | 13 / 20px | 400 | 主业务信息 |
| 强调正文 | 13 / 20px | 550–600 | 名称、编号、金额、关键值 |
| 控件文字 | 13 / 18px | 400–500 | Button、Input、Select、Tabs |
| 表头 | 12 / 16px | 500 | DataTable Header |
| 元信息 | 12 / 16px | 400 | 时间、国家、辅助说明 |
| 微型提示 | 11 / 16px | 400 | 极少量计数、角标，不承载关键正文 |
| KPI 数值 | 24 / 28px | 600 | 概览指标 |

规则：

- 业务页面不自行创造新字号；
- 中文和英文使用同一角色，不为英文单独缩小；
- 表格主信息可以双层显示，次信息使用元信息角色；
- 90% 下微型提示仅用于非关键内容；
- 长段说明、表单帮助和错误信息不得使用微型提示。

### 7.2 Shell

| 项目 | 目标 |
| --- | ---: |
| 顶栏高度 | 52px |
| Sidebar 展开宽度 | 200px |
| Sidebar 折叠宽度 | 60px |
| Sidebar Header 高度 | 52px |
| 一级导航行高 | 36px |
| 二级导航行高 | 34px |
| 导航文字 | 13px |
| 导航图标 | 16px |
| 一级导航水平内距 | 12px |
| 导航项间距 | 2–4px |
| 底部收起入口 | 40px |

要求：

- `ShellHeader`、Sidebar、Inset Header、Rail 顶部区统一消费 Shell token；
- 品牌、子系统切换、搜索、消息、主题和用户入口重新校准到 52px；
- Sidebar Header 不使用大面积彩色卡片；
- 当前项使用轻背景和主色文字，不依赖厚边框或阴影；
- 三种布局保持同一视觉比例，不允许切换布局后密度跳变。

### 7.3 页面骨架

| 项目 | 目标 |
| --- | ---: |
| 页面水平内距 | 22px |
| 页面垂直内距 | 16px |
| 面包屑高度 | 24px |
| 面包屑与主体间距 | 10–12px |
| 页面区块间距 | 12–16px |
| Surface 圆角 | 8–10px |
| 普通 Section 内距 | 12–16px |

要求：

- 列表页优先单一工作面，不套多层大 Card；
- PageSurface 的边框和阴影必须弱于 Dialog/Popover；
- 页面标题与主操作尽量同行；
- 不通过大标题区重复业务上下文；
- 页面背景、Surface、区块背景最多形成三级层次。

### 7.4 搜索与筛选

| 项目 | 目标 |
| --- | ---: |
| 默认筛选控件高度 | 30px |
| 主要操作按钮高度 | 30–32px |
| 搜索框高度 | 30px |
| 控件水平内距 | 10–12px |
| 筛选项间距 | 8px |
| 工具栏上下内距 | 8–10px |
| 下拉选项高度 | 30–32px |
| Popover 内距 | 6–8px |

统一模式：

- `SearchField`、`FilterSelect`、日期筛选、AdvancedFilter 和批量操作由 Pro 工具栏组合；
- 搜索、筛选、主操作不能分别占据多行，除非视口不足；
- Dropdown 与触发器左边缘对齐；
- 计数属于元信息，不与标签争夺视觉权重；
- 选中条件可见、可清除、可从 URL 恢复；
- 浮层必须覆盖 default、hover、focus、selected、checked、disabled 状态。

### 7.5 Checkbox 与 Choice

| 项目 | 目标 |
| --- | ---: |
| Checkbox 视觉尺寸 | 14px |
| 表格选择列宽 | 40px |
| 表格行点击热区 | 40×44px 以上 |
| Checkbox 与文字间距 | 8px |

要求：

- 视觉方框缩小不等于点击区域缩小；
- 表头与正文 Checkbox 垂直中心必须一致；
- 支持 unchecked、hover、focus、checked、indeterminate、disabled；
- checked/indeterminate 不只靠颜色，必须有图形；
- 行选择仍只通过 DataTable selection API；
- Checkbox label 使用控件文字或表格正文角色。

### 7.6 DataTable

| 项目 | 目标 |
| --- | ---: |
| 表头高度 | 38px |
| 正文行高 | 44px |
| 表头字号 | 12px |
| 正文字号 | 13px |
| 次信息字号 | 12px |
| 单元格水平内距 | 12px |
| 状态标签高度 | 20–22px |
| 分页控件高度 | 28–30px |

要求：

- 标准业务表格唯一使用 `DataTable`；
- `TableShell` 只做遗留兼容，不新增能力，随 roles/menus 迁移退役；
- 表头只使用轻背景或白底分割线；
- 行分割线弱于表头边界；
- 主信息和次信息允许两层排布；
- 状态标签小而清晰，不使用大色块；
- 行动作优先文本或紧凑菜单；
- 固定列保持不透明背景；
- 可点击行支持 Enter、Space、focus、`aria-selected`、`aria-busy`；
- 1440×900 标准列表首屏目标展示不少于 10 行有效记录；
- KPI 不得以大卡片形式长期占据列表首屏。

### 7.7 Card 与 Metric

Card 不再由一个全局 spacing 覆盖所有语义。

明确三种使用场景：

1. **Panel**：普通内容面板，内距 16px；
2. **Compact Section**：数据工作台区块，内距 14px；
3. **Comfortable Surface**：表单、打印、复杂编辑，内距 24px。

`Card` 增加受控的 `spacing="compact" | "default" | "comfortable"` 视觉属性，默认值为 `default`。该属性只表达内容语义，不进入 appearance store，也不允许业务页面通过 className 覆盖 padding。

这不是用户可切换的密度轴，而是组件语义。现有 `p-4` / `p-5` / `p-8` 覆盖必须迁移到明确的 spacing 属性或更合适的 Pro 组件。

Metric 目标：

| 项目 | 目标 |
| --- | ---: |
| 最小高度 | 96px |
| 内距 | 14px |
| 标签 | 12–13px |
| 数值 | 24px |
| 趋势 | 11–12px |
| 图标 | 16px |

要求：

- 高度使用 `min-height`，不锁死内容；
- 图标默认无大面积彩色方块；
- 趋势不只靠红绿和上下箭头；
- 无趋势、长标题、负数、大金额和英文必须不溢出；
- 新增组件前先检查 Coss；适合则 copy-in 后 token 化，不适合再实现 Pro 组件；
- Pro Metric 不 import module、不接业务 DTO、不使用 i18n。

### 7.8 详情工作台

详情页统一基于 `PageScaffold` 演进，不创建第二套页面骨架。

新增或收敛为以下 Pro 组合：

- `DetailWorkspace`：主内容 + 右侧工作栏；
- `DetailHeader`：返回、记录标题、状态、摘要和动作；
- `DetailSection`：区块标题、说明、动作和内容；
- `DescriptionList`：紧凑多列字段；
- `DetailAside`：状态、主动作、时间线和审计记录。

1440×900 结构：

```text
┌────────────────────────────────────────────────────────────┐
│ 返回 / 记录标题 / 状态 / 摘要                 次要动作 主动作 │
├──────────────────────────────────────┬─────────────────────┤
│ 基础信息 5 列                         │ 当前状态与主动作      │
│ 收发件 / 关联方 2 列                  │                      │
│ 明细表                                │ 时间线               │
│ 历史 / 费用 / 记录                    │                      │
│                                      │ 操作记录             │
└──────────────────────────────────────┴─────────────────────┘
```

几何目标：

| 项目 | 目标 |
| --- | ---: |
| 记录头部最小高度 | 56px |
| 主区与侧栏间距 | 12px |
| 右侧工作栏宽度 | 296px |
| Section Header | 40px |
| Section Body 内距 | 14px |
| 字段 label / value 间距 | 4px |
| 多列字段列间距 | 24px |
| 明细行高 | 36px |

要求：

- 单个基础属性禁止做独立大卡片；
- 基础信息在 1440px 下优先 4–5 列；
- 关联方地址优先双栏；
- 明细、费用和历史使用紧凑表格/列表；
- 右侧栏可 sticky，但不得产生独立页面滚动陷阱；
- 1024px 下右侧栏进入主内容下方；
- Tabs 只用于真正互斥的大块内容，不用来隐藏本应连续浏览的信息；
- 1440×900 首屏至少展示记录头、基础信息、关联方/地址、第一段明细和右侧状态动作。

### 7.9 Dashboard 与 Overview

- Dashboard 继续保留概览属性，但减少“展示型大卡片”；
- KPI 使用统一 Metric；
- 快捷入口改为紧凑图标 + 文字，不使用 48px 彩色图标底座；
- 图表与待办优先占据首屏主区域；
- 尾程列表页的大 KPI 卡移除，或降级为单行 Summary Strip；
- 业务列表页不承担 Dashboard 的职责。

## 8. 颜色、边界与阴影

### 8.1 文字层级

- `text`：记录标题、正文和关键值；
- `text-2`：一般标签、导航和辅助正文；
- `text-3`：元信息、时间和占位信息；
- disabled：单独语义，不用 `text-3` 代替。

要求：

- 学习 Claude Design 的冷静灰阶关系；
- 不直接复制 `#9AA0B0` 等低对比颜色；
- 12–13px 正常文字在实际背景上满足生产可读性；
- 暗色模式分别校准，不对亮色 token 做简单反转。

### 8.2 边界层级

实际颜色强度控制为两级：

1. **strong divider**：Shell、表头、主分区；
2. **subtle divider**：表格行、卡片、内部区块。

Shell、Page、Card、Table 可以有上下文别名，但禁止为每个组件创造肉眼不可分辨的新灰色。

### 8.3 阴影与圆角

- 普通页面 Surface 以边框为主、阴影为辅；
- Popover、Dropdown、Dialog 使用更明确阴影；
- 选中态不靠阴影；
- 默认圆角目标 8–10px；
- flavor 可通过 `--radius-factor` 改变气质，但不能改变布局密度；
- 禁止业务层任意圆角和硬编码阴影。

## 9. 组件与架构归属

### 9.1 UI 层

负责：

- Button、Input、Select、Checkbox、Table、Card、Tabs、Popover、Dropdown；
- 组件尺寸、颜色、状态、动画、焦点和无障碍；
- 消费组件族 token。

### 9.2 Pro 层

负责：

- DataTable；
- `DataToolbar`：SearchField、FilterSelect、AdvancedFilter、批量操作和主操作的统一组合；
- Metric；
- PageScaffold；
- DetailWorkspace / DetailSection / DetailAside；
- DescriptionList、StatusBadge、Pagination；
- 业务无关的列表与详情工作模式。

Pro 禁止：

- import `@/modules/**`；
- 接收业务 DTO；
- `useTranslation`；
- 权限判断和接口请求；
- 业务状态机。

### 9.3 Module 层

只负责：

- 页面布局；
- 业务数据和状态编排；
- i18n 文案；
- 业务列定义、字段和动作；
- 组合 UI/Pro。

本轮触达页面必须清理既有视觉越界，不能只做到“不新增”。

## 10. 页面迁移范围

全面对齐不是只改样板页。样板页用于验证契约，完成定义覆盖全部生产页面。

### 10.1 样板页

1. **运单列表**：表格、筛选、Checkbox、状态、分页、Summary Strip；
2. **运单详情**：记录头、DescriptionList、明细、右侧工作栏；
3. **Dashboard / 尾程 Overview**：Metric、快捷入口、图表、待办；
4. **用户与部门**：树表工作台、工具栏、DataTable；
5. **`/dev/theme-states`**：全部基础状态。

### 10.2 全量迁移

- Admin：dashboard、users、roles、menus、messages、logs、files、company、dictionaries、profile；
- Lastmile：overview、shipments、customers、channels、carriers、suppliers、billing；
- Auth：login、register、forgot-password；
- 相关 detail、form、dialog、sheet、popover 和 dropdown。

业务行为、路由协议、查询参数和接口契约不因视觉迁移改变。

## 11. 当前影响面

实施前必须形成代码清单，至少覆盖：

- Shell 中的 `h-14`、232px Sidebar、42px 导航等硬编码；
- `tokens.base.css` 的 48px 表头、24px Card、28/20px PageFrame；
- flavor 文件中的几何覆盖；
- 20 个 Card 使用文件；
- 15 个文件、32 处 CardContent padding 覆盖；
- Dashboard 中的内联 style、业务视觉状态和裸 button；
- Lastmile 列表、详情和表单中的 `p-4` / `p-5` / `p-8`；
- DescriptionList 卡片化字段；
- DataTable 选择列、Checkbox 和表头基线；
- PageScaffold 的 52px PaneHeader、PageSection leading icon 和 Surface；
- `/dev/theme-states` 与相关守卫。

## 12. 守卫与测试设计

### 12.1 先写守卫

新增或强化：

- Shell 几何 token 快照；
- flavor 禁止覆盖共享密度 token；
- DataTable 表头、行高、cell padding 和选择列契约；
- TableShell 禁止进入新业务包；
- Card/Metric/Detail 组件 token 消费；
- 业务页面禁止视觉状态、裸控件、内联 style 和任意圆角；
- 目标页面禁止重新出现大 KPI 图标底座；
- `/dev/theme-states` 包含新增组件与状态。

### 12.2 组件测试

覆盖：

- Checkbox：unchecked / hover / focus / checked / indeterminate / disabled；
- FilterSelect：closed / open / selected / disabled / long label；
- DataTable：空、加载、错误、选择、固定列、行点击、键盘；
- Metric：正向、负向、无趋势、长标题、英文、大数值；
- DetailWorkspace：无侧栏、有侧栏、长字段、窄桌面；
- 明暗模式和不同 flavor 的 token 解析。

### 12.3 真实浏览器矩阵

主视口：1440×900。

详细矩阵：

- Feishu；
- light / dark；
- 90% / 100% / 108%；
- 运单列表、运单详情、Dashboard、用户与部门、theme-states。

风险 smoke：

- Claude / Shadcn / Sera；
- light / dark；
- 100%；
- 运单列表、运单详情、theme-states。

布局 smoke：

- Sidebar / Inset / Rail；
- 1440×900、1280×720、1024×768；
- 100%；
- 运单列表和运单详情。

每次截图前必须断言：

- URL；
- 登录态；
- flavor；
- mode；
- layout；
- zoom；
- 关键文本；
- 页面加载完成。

### 12.4 视觉验收方法

Claude Design 与实现使用同一视口、同类状态并排审查。

关键几何使用 DOM 实测：

- Shell 高度和宽度；
- 页面内距；
- 控件高度；
- 表头、正文行和选择列；
- KPI 高度；
- 详情侧栏宽度；
- 首屏可见行数和区块数；
- 横向/纵向溢出。

像素 diff 只用于发现差异，不设“为了降低差异而删除真实功能”的机械目标。

## 13. 可访问性底线

- 视觉缩小不缩小语义点击区域；
- 所有可点击行、按钮、Checkbox、Tabs、Dropdown 可键盘操作；
- focus-visible 清晰；
- 状态不只靠颜色；
- 正常文字保持生产可读性；
- 90% / 100% / 108% 无文本裁切；
- 1024px 桌面宽度不产生 Header 重叠；
- `prefers-reduced-motion` 下动画降级；
- Portal 浮层定位、焦点返回和 Esc 关闭正常。

本规格不能单凭截图宣称完整 WCAG 合规，最终需要 DOM、键盘和对比度测试。

## 14. 实施批次

每一批独立提交、独立验证，避免一次性大爆炸。

本文是主视觉契约，不直接作为单个超大实施计划。批次 A–G 各自形成独立实施计划；上一批验证通过后才进入下一批。

### 批次 A：守卫与几何真相源

- 增加守卫；
- 建立共享 Shell/Page/Table/Choice/Card 几何 token；
- 清理 flavor 密度覆盖；
- 更新四份 `docs/design/*.design.md` 的几何值表和允许差异说明；
- 不迁业务页面。

### 批次 B：Shell 与基础控件

- ShellHeader、三种布局、Sidebar Header、导航；
- Button、Input、Select、Checkbox、Popover、Dropdown；
- theme-states。

### 批次 C：DataTable 与筛选

- DataTable、Pagination、SearchField、FilterSelect、AdvancedFilter；
- 运单列表样板；
- 用户列表回证。

### 批次 D：详情工作台

- PageScaffold 演进；
- DetailWorkspace、DescriptionList、DetailSection、DetailAside；
- 运单详情样板；
- customers/channels/carriers/suppliers 反向验证。

### 批次 E：Dashboard 与 Metric

- Metric；
- Dashboard；
- Lastmile Overview；
- 列表页大 KPI 收敛。

### 批次 F：全量页面迁移

- Admin；
- Lastmile；
- Auth；
- dialogs、sheets、forms 和特殊页面。

### 批次 G：矩阵验收与文档收口

- 全量门禁；
- 生产构建；
- 视觉矩阵；
- diff 和尺寸记录；
- 本规格回填最终证据。

## 15. 非目标

- 不修改后端、接口或业务规则；
- 不更换 Radix/shadcn primitives；
- 不复制 Claude Design 源码；
- 不引入 CSS zoom；
- 不新增密度设置；
- 不做移动端专项设计；
- 不借视觉改造重构无关业务代码；
- 不同时引入第二套表格或页面骨架。

## 16. 完成定义

只有同时满足以下条件，才能宣称“视觉全面对齐完成”：

- 所有生产页面完成迁移，不只是样板页；
- Shell、表格、筛选、Checkbox、详情和 Dashboard 达到本规格几何；
- 全部 flavor 共享同一密度，切换后布局不跳变；
- 三种导航布局通过桌面 smoke；
- 90% / 100% / 108% 通过真实浏览器验证；
- 1440×900 列表首屏不少于 10 行有效记录；
- 详情首屏达到本规格的信息覆盖；
- 业务页面不承载通用视觉状态；
- `/dev/theme-states` 和 guard 覆盖新增组件；
- TypeScript、ESLint、Vitest、theme guard、design lint 全绿；
- 生产构建通过且不包含 faker、msw、mock worker；
- 截图、关键尺寸和差异分析回填本规格；
- 没有未说明的视觉或功能回归。

## 17. 必跑门禁

```bash
cd frontend
./node_modules/.bin/tsc -b --noEmit
./node_modules/.bin/eslint src
./node_modules/.bin/vitest run
pnpm theme:guard
pnpm design:lint
./node_modules/.bin/tsc -b
./node_modules/.bin/vite build
```

构建后检查 `dist` 不包含：

```text
faker
msw
mockServiceWorker
```

UI 复刻与视觉融合批次必须执行 `pnpm visual`，采集三档显示比例并把结论写回本规格。

## 18. 分批视觉回证

### 18.1 批次 C：DataTable 与筛选

2026-07-30 使用 Agent Browser 在 Feishu / light / 100% / Sidebar / 1440×900 下实测：

| 页面 | 表头 | 正文行 | 工具栏 | 首屏有效行 | 横向溢出 |
| --- | ---: | ---: | ---: | ---: | --- |
| 运单列表 | 38px | 44px | 47px | 10 / 10 | 无 |
| 成员列表 | 38px | 44px | 46px | 10 / 10 | 无 |
| 部门列表 | 38px | 44px | 不适用 | 8 / 8 | 无 |

结论：

- 运单列表的四张大 KPI 卡已降级为 42px Summary Strip；
- 搜索、筛选和操作收敛到同一 `DataToolbar`，搜索框高度为 30px；
- DataTable 选择列收敛到 40px，Checkbox 继续由统一 selection API 管理；
- 部门列表因数据集只有 8 条，首屏完整展示全部 8 条，不以补造 mock 数据伪造“10 行”；
- 截图保存在忽略提交的 `frontend/test-results/claude-alignment/batch-c/`，作为本地复查产物。

### 18.2 批次 D：详情工作台

2026-07-30 使用 Agent Browser 在 Feishu / light / 100% 下实测：

| 视口 | 主区 / 侧栏 | 侧栏行为 | 首屏覆盖 | 横向溢出 |
| --- | --- | --- | --- | --- |
| 1440×900 | 870px / 296px | sticky | 记录头、基础信息、收发件、包裹、费用起始、状态与完整轨迹 | 无 |
| 1024×768 | 单列 762px | 下沉、static | 主工作区后连续呈现 | 无 |

反向打开 customers、channels、carriers、suppliers 四类详情，紧凑 `DescriptionList` 均正常渲染且无横向溢出。

结论：

- 运单详情已移除四张单属性 Card 和用于隐藏连续信息的 Tabs；
- 记录头、五列基础字段、双栏关联方、包裹、费用、296px 状态工作栏和轨迹使用统一 Pro 详情契约；
- 1440×900 下七个详情区块均已进入首屏，右栏没有独立滚动容器；
- 截图保存在忽略提交的 `frontend/test-results/claude-alignment/batch-d/`。
