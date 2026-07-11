# 菜单管理三栏工作区 Design QA

- 日期：2026-07-10
- 页面：`/admin/menus`
- 实现截图：`test-results/m0-visual/app-menus.png`
- 三档截图：`test-results/m0-visual/app-menus-{sm,md,lg}-dialog.png`
- 视口：1440 × 900
- 状态：飞书浅色主题、管理员登录、后台管理子系统、工作台菜单选中

## Full-view comparison evidence

- 工作区调整为“子系统管理 / 菜单管理 / 菜单详情”三段式，桌面端按 2:3:5 分配宽度。
- 子系统从顶部横向 Tabs 恢复为左侧纵向卡片；当前子系统、类型、启用状态和编辑入口保持清晰可达。
- 菜单树继续作为中间主工作区；详情区增加独立 Header，标题和内容边界统一由 PageScaffold 承载。
- 中栏 Header 的节点数量下沉为次级信息，窄栏下不再挤压“菜单管理”标题。
- 低于桌面三栏断点时，子系统与菜单详情使用 Sheet 承载，不保留被压缩到不可读的三列。

## Engineering evidence

- 三栏布局、Pane Header/Footer 和子系统卡片视觉沉到 `components/pro`，业务层只传数据、状态和语义回调。
- 菜单场景拆分为 `SubsystemPanel`、`MenuWorkspace`、`MenuOverlays`，没有重新形成单文件巨型页面。
- 结构、卡片状态与交互由行为测试和模块边界守卫固定，`/dev/theme-states` 同步覆盖新增 Pro 状态。
- Agent Browser 复核 90% / 100% / 108%：整页无横向溢出，菜单编辑弹窗随比例缩放且保持在视口内。

## Findings

- 无 P0、P1、P2 问题。
- 本节替代下方旧版顶部子系统卡片带结论；旧记录仅保留为设计演进历史。

final result: passed

---

# 历史记录：菜单管理交互精简 Design QA

- 日期：2026-07-10
- 页面：`/admin/menus`
- 源视觉真值：`/var/folders/sv/6xdcgw9128qc4jbx1pj64km80000gn/T/codex-clipboard-31f0ef96-18e2-49e9-8c48-442427d54d63.png`
- 页面布局实现截图：`/tmp/menu-tree-polish-current.png`
- 页面详情实现截图：`/tmp/menu-detail-polish-final-2026-07-10.png`
- 菜单操作实现截图：`/tmp/menu-management-polish-final-2026-07-10.png`
- 基本信息对齐截图：`/tmp/menu-detail-alignment-final-2026-07-10.png`
- 内联编辑实现截图：`/tmp/menu-inline-edit-scale-md-2026-07-10.png`
- 菜单选中项按下态截图：`/tmp/menu-active-press-fixed-2026-07-10.png`
- 视口：1720 × 996
- 状态：飞书浅色主题、管理员登录、目录 hover、叶子页面选中

## Full-view comparison evidence

- 顶部子系统卡片带已移到主工作区卡片外，通过间距建立层级，不再依赖内部横向分割线。
- 菜单树工具栏收敛为“菜单管理 + 导航节点总数”的单行摘要，操作按钮保持在右侧。
- 详情页底部不再出现新增页面或删除操作区，内容自然结束在基础信息或页面操作区域。
- 页面删除按钮已移至详情头部，与编辑按钮并列。
- 子系统已有项使用白色实体卡，当前项使用主题色细描边；新增入口使用接近页面背景的浅灰虚线卡。
- 右侧详情收敛为摘要、基础信息、页面操作三块浅灰卡片，字段不再依赖横向分隔线。
- 基本信息保持两列，所有字段使用统一高度和标签/值基线；显示开关跟随状态文字，不再漂在列尾。
- 点击详情头部编辑后，基本信息原地切换为两列表单，不再打开编辑弹窗；新增和动作编辑弹窗实现仍保留。

## Focused region comparison evidence

- 目录行 hover：`组织与权限` 的加号出现在类型徽标左侧；两个图标尺寸都是 `14px`，加号计算样式由 `opacity: 0` 变为 `opacity: 1`。
- 主从区域分隔：菜单树仅保留 `1px` 右边框，详情栏左边框为 `0px`，不再叠加成粗线。
- 子系统当前项：计算样式为白底、`1px rgb(51, 112, 255)` 主题色描边；新增卡为 `rgb(245, 246, 247)` 背景和虚线边框。
- 页面操作列表：外层边框为 `0px`，行间距为 `6px`，每行使用白底卡片；编辑与删除改为无图标的小号文字操作。
- 详情头部：容器 `align-items: center`，节点名称、类型徽标和编辑/保存按钮垂直居中。
- 内联编辑：90% / 100% / 108% 的 `--app-scale` 分别为 `0.9 / 1 / 1.08`，三档横向溢出均为 `0px`；100% 时四个主表单控件同高 `36px`。
- 选中菜单按下态：真实 `:active` 状态下内层按钮背景为 `rgba(0, 0, 0, 0)`，外层选中背景保持主题蓝 10% 透明度，不再出现局部灰色块。
- 菜单树快速 Hover：整行、节点按钮、展开按钮和 Hover 加号的计算 `transition-duration` 均为 `0s`；只有展开/折叠容器保留 `grid-template-rows, opacity 220ms`。
- 目录新增：点击加号打开新增菜单弹窗，节点类型固定为“菜单”，父级固定为“组织与权限”。
- 页面删除：选中 `企业概览` 后，删除按钮与编辑按钮位于同一操作容器；点击可打开确认删除弹窗。
- 浏览器控制台：无页面运行时 error；仅有 Vite、MSW 和 React DevTools 的开发态信息日志。
- 显示比例矩阵：90% / 100% / 108% 均无横向溢出，菜单弹窗保持在视口内。

## Findings

- 无 P0、P1、P2 问题。
- 字体与排版：沿用现有飞书主题字号、字重与单行截断规则，无新增字体漂移。
- 间距与布局：子系统卡片带外置；树节点使用固定尾部操作槽，加号紧贴类型徽标左侧且所有徽标对齐；主工作区底部保持贴近视口。
- 颜色与 token：新增状态仅使用既有 Button、hover 和危险操作 token，无硬编码颜色。
- 图片与资源：该页面不包含业务图片；树节点的展开和新增替换为更轻量的 Lucide 图标，页面操作编辑/删除移除图标。
- 文案与内容：新增目录操作文案为“在{目录名}下新增页面”，语义和上下文一致。

## Comparison history

1. 初始实现存在源图标注的两个 P2：顶部说明占位过多；详情底部操作区与对象上下文脱节。
2. 修复后移除顶部说明/分隔线和详情底部操作区，将目录新增移到树 hover、页面删除移到详情头部。
3. 二次优化把子系统卡片带移到主卡片外，压缩菜单工具栏，并把目录加号移到图标左侧固定槽。
4. 本轮进一步重构树节点尾部、详情卡片、子系统描边和页面操作列表；真实交互复核未发现剩余 P0/P1/P2。

## Implementation checklist

- [x] 顶部只排列子系统卡片
- [x] 子系统卡片带位于主工作区卡片外
- [x] 子系统实体卡为白底，当前项使用主题色描边
- [x] 新增子系统使用浅灰虚线卡
- [x] 菜单工具栏使用单行结构摘要
- [x] 目录 hover 显示新增页面加号
- [x] 目录加号位于类型徽标左侧且徽标对齐
- [x] 树节点展开和新增图标更轻量
- [x] 主从区域只保留 1px 分隔线
- [x] 页面节点不显示新增页面加号
- [x] 页面删除与编辑并列
- [x] 详情使用浅灰卡片分组，基础字段无横向分隔线
- [x] 基本信息两列字段对齐，显示开关紧跟状态文字
- [x] 详情标题、类型徽标和操作按钮垂直居中
- [x] 点击编辑后基本信息原地编辑，保存失败保留编辑态
- [x] 选中菜单在按下态仍保持整行统一背景
- [x] 菜单树高频 Hover 颜色与透明度反馈无过渡延迟
- [x] 守卫禁止 `MenuTreeTable` 重新引入行级背景过渡
- [x] 原菜单表单弹窗组件保留
- [x] 页面操作列表无外框和分割线，编辑/删除使用文字操作
- [x] 详情底部无新增页面或删除按钮
- [x] 新增和删除交互可达
- [x] 浏览器无运行时错误
- [x] 三档显示比例无横向溢出

## Follow-up polish

无阻断项。

final result: passed

---

# 角色详情 Header 分层 Design QA

- 日期：2026-07-10
- 页面：`/admin/roles?roleId=fin`
- 源视觉真值：`/var/folders/sv/6xdcgw9128qc4jbx1pj64km80000gn/T/codex-clipboard-fa8630b6-3c8e-4666-a549-15562279b404.png`
- 初始实现截图：`test-results/roles-detail-header/before.png`
- 首轮实现截图：`test-results/roles-detail-header/after-first-pass.png`
- 最终实现截图：`test-results/roles-detail-header/after-border-reduction.png`
- 数据权限实现截图：`test-results/roles-detail-header/data-permissions.png`
- 合并对照图：`test-results/roles-detail-header/comparison-border-reduction.png`、`test-results/roles-detail-header/comparison-focused.png`
- 视口：1495 × 1056，DPR 1
- 状态：飞书浅色主题、财务角色、功能权限 / 数据权限 / 角色成员

## Full-view comparison evidence

- 详情页已从标题、说明、Tabs 连续堆叠改为“角色摘要卡 + 12px 灰色间隔 + Tabs 工作卡”。
- Header 独立承载角色名称、角色类型、职责说明、成员数量和默认数据范围；Tabs 与编辑内容进入第二层工作区。
- Header 与 Tabs 工作区均移除外边框和阴影，层级仅由灰色背景和 12px 间隔建立。
- 参考图的大型业务信息矩阵没有照搬；本页仅保留角色管理真正需要的两项摘要信息，避免 Header 过高。

## Focused region comparison evidence

- Header 与 Tabs 工作区计算样式均为 `border: 0px`、无阴影；Header 内部不再包含分割线。
- Header 与 Tabs 工作区间距 12px；详情容器背景为 `rgb(245, 246, 247)`。
- 功能权限操作栏只保留“折叠 / 全部授权 / 保存”；全部授权后文案切换为“全部取消”，不存在功能权限“重置”按钮。
- 数据权限和角色成员 Tab 均保持在同一工作卡中，切换后无横向溢出。
- 90% / 100% / 108% 显示比例下，Header、工作区和详情 Shell 均无横向溢出或纵向裁切。
- 控制台没有本次角色详情改动引入的运行时错误；开发环境仍会记录既有 `mockServiceWorker.js` 缺失错误。

## Findings

- 无 P0、P1、P2 问题。
- 字体与排版：标题、类型标签、描述和摘要信息形成三级层级；沿用现有飞书字体与字号 token。
- 间距与布局：Header 和工作区使用既有 Card 原语但移除外框与阴影，12px 间隔提供明确分层，同时保留权限表的可视高度。
- 颜色与 token：中间隔离层使用 `--pro-page-bg`，卡片继续使用既有 surface、border 和 shadow token，无硬编码颜色。
- 图片与资源：该页面没有业务图片；删除动作和权限图标沿用现有 Lucide 与项目图标映射。
- 文案与内容：保存按钮精简为“保存”；全量切换明确区分“全部授权 / 全部取消”；功能权限重置入口已移除。

## Comparison history

1. 初始实现存在一个 P2：角色标题、描述、Tabs 与操作栏连续堆叠，视觉层级不清晰。
2. 首轮修复引入独立摘要 Header、灰色间隔和 Tabs 工作卡，并收敛功能权限操作文案。
3. 用户反馈卡片边框过多后，移除 Header、工作区外框/阴影和 Header 内部分割线，仅保留必要结构线。
4. 最终对照及三档显示比例复核未发现剩余 P0/P1/P2。

## Implementation checklist

- [x] 独立角色摘要 Header
- [x] 展示成员数量和默认数据范围
- [x] Header 与 Tabs 工作区具有 12px 视觉隔离
- [x] Header 与 Tabs 工作区无外边框和阴影
- [x] Header 内部无分割线
- [x] 功能权限按钮改为“保存”
- [x] 移除功能权限“重置”
- [x] 全量按钮在“全部授权 / 全部取消”间切换
- [x] 三个详情 Tab 保持可用
- [x] 90% / 100% / 108% 无溢出

## Follow-up polish

无阻断项。

final result: passed

---

# 角色功能权限连续面板 Design QA

- 日期：2026-07-10
- 页面：`/admin/roles?roleId=fin`
- 源视觉真值：`/var/folders/sv/6xdcgw9128qc4jbx1pj64km80000gn/T/codex-clipboard-4712c190-56c0-4f5f-9a96-16eb60f2edfc.png`、`/var/folders/sv/6xdcgw9128qc4jbx1pj64km80000gn/T/codex-clipboard-cda35308-f4a2-4f70-82e2-ead2fa07590c.png`
- 展开态实现截图：`test-results/roles-permission-polish/after-expanded.png`
- 折叠态实现截图：`test-results/roles-permission-polish/after-collapsed.png`
- 合并对照图：`test-results/roles-permission-polish/comparison-expanded.png`、`test-results/roles-permission-polish/comparison-collapsed.png`
- 视口：1440 × 960，DPR 1
- 状态：飞书浅色主题、财务角色、功能权限、展开与全部折叠

## Full-view comparison evidence

- 权限分组已从多个独立圆角卡片改为单一外框；组头、权限资源行和下一个组头连续衔接。
- 折叠态中 5 个权限组共享同一圆角边框，相邻组之间没有留白，视觉结构与参考图的表格式折叠行一致。
- 左侧角色列表不再绘制右边框，右侧详情区保留 1px 左边框，主从分栏从双线收敛为单线。

## Focused region comparison evidence

- 折叠态计算样式：首组 `border-top: 0px`，后续组 `border-top: 1px`；组高分别为 52px / 53px，额外 1px 仅来自相邻行分隔线。
- 展开态计算样式：最外层 `border-width: 1px`、`border-radius: 9px`、无 flex/grid gap；资源行使用同一 `--table-row-border`。
- 分栏计算样式：角色列表 `border-right: 0px`，详情区 `border-left: 1px`。
- 90% / 100% / 108% 显示比例下，角色工作区与权限滚动区均无横向溢出。
- 主要交互已验证：全部折叠、全部展开、权限组动画、权限按钮可达。
- 控制台没有本次角色页面改动引入的运行时错误；开发环境仍会记录既有 `mockServiceWorker.js` 缺失错误。

## Findings

- 无 P0、P1、P2 问题。
- 字体与排版：沿用现有飞书主题字号、字重、代码标识和单行层级，未引入字体漂移。
- 间距与布局：移除组间 12px 间距和每组独立圆角，保留 52px 组头与紧凑资源行；单容器结构提升纵向扫描连续性。
- 颜色与 token：外框和行分隔统一使用 `--table-row-border`，背景沿用 `--table-bg` / `--table-header-bg`，无硬编码颜色。
- 图片与资源：页面无业务图片；权限组继续使用现有 Lucide 图标和项目图标映射。
- 文案与内容：折叠、展开、授权数量和权限动作文案保持不变。

## Comparison history

1. 初始实现存在两个 P2：权限分组各自带圆角边框和 12px 间距，无法形成表格连续行；角色列表右边框与详情左边框同时存在，形成视觉双线。
2. 修复后使用单一权限容器统一外框，组与资源行仅保留单条顶部分隔线；移除角色列表右边框。
3. 最终展开态、折叠态及三档显示比例复核未发现剩余 P0/P1/P2。

## Implementation checklist

- [x] 权限分组共享单一圆角外框
- [x] 折叠组之间无间距
- [x] 展开资源行连续衔接
- [x] 组间和资源行仅保留单条分隔线
- [x] 左右主从分栏仅保留一条边界
- [x] 90% / 100% / 108% 无横向溢出
- [x] 折叠与展开交互可达

## Follow-up polish

无阻断项。

final result: passed

---

# 角色详情扁平布局恢复 Design QA

- 日期：2026-07-10
- 页面：`/admin/roles?roleId=fin`
- 源视觉真值：`test-results/roles-detail-header/before.png`
- 最终实现截图：`test-results/roles-detail-header/restored-flat-layout.png`
- 权限表无外框截图：`test-results/roles-permission-polish/no-outer-border.png`
- 默认折叠状态截图：`test-results/roles-permission-polish/default-first-group-open.png`
- 详情滚动顶部截图：`test-results/roles-permission-polish/detail-shell-scroll-top.png`
- 详情滚动后截图：`test-results/roles-permission-polish/detail-shell-scrolled.png`
- 合并对照图：`test-results/roles-detail-header/comparison-restored-flat.png`
- 视口：1495 × 1056，DPR 1
- 状态：飞书浅色主题、财务角色、功能权限

## Full-view comparison evidence

- 已移除角色摘要卡、灰色间隔和独立 Tabs 工作卡，恢复标题、描述、详情 Tabs、功能内容连续排列的整体布局。
- 详情 Shell 恢复透明背景和 28px × 22px 原始内边距；内部 Card 数量为 0。
- 功能权限连续表格、单分栏线以及“全部授权 / 全部取消 / 保存”文案调整继续保留。
- 功能权限折叠表最外层边框已移除，圆角裁切和组内单线保留。
- 功能权限默认只展开第一个分组，其余分组保持折叠，降低首屏信息密度。
- 右侧角色详情成为唯一纵向滚动容器，标题、详情 Tabs、操作栏和权限表随详情区域整体滚动。

## Focused region comparison evidence

- 详情布局计算样式无额外 gap，详情 Shell 无横向溢出。
- 权限折叠表三档显示比例下计算外框均为 `0px`，且无横向溢出；第二组起继续保留 1px 顶部分隔线。
- 展开态详情 Shell 为 `overflow-y: auto`，可视高度 903px、内容高度 1148px；内部权限容器为 `overflow-y: visible` 且滚动值保持 0。
- 详情向下滚动 245px 后，标题和详情 Tabs 同步移出视口，左侧角色列表滚动值保持 0。
- 首次进入和每次切换角色后均为 1 个分组展开；切走再切回同一角色也不会恢复旧的展开状态。
- 手动展开全部分组后，详情 Shell 内容高度为 1148px、滚动值可达 240px；权限表内部滚动值仍为 0。
- 90% / 100% / 108% 下均只有首个分组默认展开，页面、工作区和详情区无横向溢出。
- 页面上层“角色管理 / 操作日志”和详情内层 Tabs 均保持现有交互；本轮没有继续新增视觉容器。
- 参考图与恢复截图的主要结构一致；按钮文案和连续权限表属于用户已确认的后续优化，属于预期差异。

## Findings

- 无 P0、P1、P2 问题。
- 字体与排版：恢复原有标题、说明、Tabs 的紧凑层级。
- 间距与布局：移除两层卡片和 12px 分隔，详情内容重新作为单一整体布局。
- 颜色与 token：移除详情区额外 `--pro-page-bg`，回到父级页面 surface。
- 图片与资源：该页面无业务图片，没有资产变化。
- 文案与内容：保留“保存”和“全部授权 / 全部取消”，功能权限不恢复“重置”。

## Comparison history

1. 摘要 Header 方案引入卡片和间隔后，页面与双层 Tabs、复杂权限表叠加，整体视觉负担增加。
2. 减少边框仍未解决容器层级过多的问题。
3. 最终恢复扁平整体布局，对照原始实现未发现剩余 P0/P1/P2。

## Implementation checklist

- [x] 移除摘要 Header 卡片
- [x] 移除 Tabs 工作卡
- [x] 移除详情灰色间隔背景
- [x] 恢复原始详情内边距
- [x] 保留功能权限已确认优化
- [x] 权限折叠表无外围边框
- [x] 权限组和资源行内部单线保留
- [x] 右侧角色详情统一负责纵向滚动
- [x] 功能权限、数据权限和成员内容无内部纵向滚动容器
- [x] 功能权限默认只展开第一个分组
- [x] 切换角色后恢复默认折叠状态
- [x] 手动展开后仍由右侧角色详情统一滚动
- [x] 90% / 100% / 108% 默认折叠状态无横向溢出

## Follow-up polish

- 双层 Tabs 是当前主要信息架构噪音；后续若继续优化，应直接调整导航层级，而不是继续增加卡片或边框。

final result: passed
