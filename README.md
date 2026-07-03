# Handoff: 通用后台管理脚手架（含尾程快递子系统）

## 工程使用

当前 M0 交付范围：后台管理骨架、三布局 Shell、外观五维 token、鉴权/权限、菜单数据流、`admin` 子系统与“成员与部门”垂直切片。HR、CRM、Project、Lastmile 等后续子系统按计划逐步补，不在 M0 预置种子模块。

### 环境

- Node.js 24
- pnpm 11.7+
- 可选：Agent Browser CLI，用于本地视觉验收
- `pnpm-workspace.yaml` 目前只用于 pnpm build-script allowlist，不表示当前仓库已经是 monorepo。

开发态默认启用 mock；生产构建默认关闭 mock。需要显式覆盖时使用本地 `.env.development`，不要提交 `.env*`。

### 常用命令

```bash
pnpm install
pnpm dev
```

```bash
./node_modules/.bin/eslint src
./node_modules/.bin/tsc -b --noEmit
./node_modules/.bin/vitest run
./node_modules/.bin/vite build
```

视觉验收：

```bash
pnpm visual:baseline  # 从 后台管理脚手架.dc.html 采集原型基线
pnpm visual           # 采集实现截图、diff 与 90/100/108 显示比例报告
```

输出位置：

- 原型基线：`e2e/baseline/`
- 实现截图与报告：`test-results/m0-visual/`

### 关键规则

- 视觉权威源：`后台管理脚手架.dc.html`
- 设计权威源：`docs/superpowers/specs/2026-07-02-admin-scaffold-frontend-design.md`
- 执行计划：`docs/superpowers/plans/2026-07-02-m0-scaffold-foundation.md`
- 模板协作规则：`CLAUDE.md`
- 显示比例只用 `--app-scale` token 乘法，不使用 CSS `zoom`
- 服务端数据归 TanStack Query；zustand 只存 token、外观、折叠等客户端状态

---

## 原型交接稿说明

以下内容来自最初的原型交接稿，描述的是 `后台管理脚手架.dc.html` 的完整设计范围，不等于当前 M0 已实现范围。当前 M0 只以后台管理骨架与“成员与部门”垂直切片为准；Lastmile 与其他子系统进入 M1/M2 后按同一工程规则逐步实现。

## Overview
一套通用企业后台管理脚手架原型，用于快速搭建 ERP / OA 类系统。含账号鉴权、组织权限、审计、文件、字典、菜单，以及一个完整的业务子系统「尾程快递」（跨境物流尾程面单/运单/渠道）。支持多子系统切换、飞书 / Claude 两套界面风格、明暗模式、主题色、三种导航布局、显示比例与圆角风格调节、中英文语言切换。

## About the Design Files
本包中的 `.dc.html` 文件是**用 HTML 编写的设计参考稿**（展示预期外观与交互的原型），**不是可直接照搬上线的生产代码**。它运行在一个内部的「Design Component」运行时（`support.js` + `{{ }}` 模板 + `class Component extends DCLogic`），仅用于原型演示。

交接目标：**在目标代码库既有的工程环境里重建这些设计**。推荐技术栈：
- **React + TypeScript + Vite**，UI 用 **Ant Design 5**（与飞书/企业后台观感最接近）或 shadcn/ui（对应本原型的「嵌入式 / Claude 风格」）。
- 路由 `react-router`，状态用 `zustand` 或 Redux Toolkit，数据请求 `TanStack Query`，图标 `lucide-react`。
- 主题/换肤用 CSS 变量（本原型已是纯 CSS 变量驱动，可直接迁移 token）。

若已有代码库，则沿用其框架与组件库，把本原型当视觉与交互蓝本重建即可。

## Fidelity
**高保真（hifi）**：颜色、字号、间距、圆角、交互均为最终值，请像素级还原。所有值见下方 Design Tokens，也可直接从 `.dc.html` 内联样式读取。

## 架构总览（先读这一段）
- **外壳 Shell**：左侧导航 + 顶部 Header + 内容区。三种布局：`sidebar`（侧栏树，飞书经典）、`rail`（图标栏 + 二级面板，两栏通顶）、`inset`（shadcn 内容卡浮起，侧栏通顶、Header 嵌入白卡）。
- **子系统切换器**：Header 左上角（inset 布局下在侧栏顶部）。点击弹出卡片切换子系统，切换后整套左侧菜单联动更换。内置子系统：`admin`（后台管理）、`lastmile`（尾程快递），另有人事/CRM/项目/数据等「即将上线」占位。子系统可在「菜单管理」里增删。
- **外观设置**（Header 调色板图标打开的抽屉）：界面风格（飞书/Claude）、主题色（经典蓝/陶土橙/深绿/紫罗兰 + 自定义取色）、导航布局、页面切换动画、显示比例（小 90% / 中 100% / 大 108%，工程实现用 `--app-scale` token 乘法，不使用 CSS `zoom`）、圆角风格（直角/默认/圆润，按比例缩放全站 border-radius）。
- **鉴权**：独立登录/注册/找回密码分屏页（左 Hero 右表单，密码/短信/扫码三 Tab）。Header 头像菜单「退出登录」进入。
- **状态**：全部集中在一个 `Component` 类的 `this.state`，`renderVals()` 返回视图数据。迁移时拆成各页面的 hook/store。

## 模块与页面清单
### 子系统 admin（后台管理）
- **工作台/企业概览**：仪表盘，指标卡 + 图表占位 + 快捷入口。
- **组织与权限**
  - 成员与部门：部门树 + 成员表（增删改、详情抽屉、离职、批量选择）。
  - 角色与权限：角色列表 + 权限配置（按模块分组→资源→可变动作 chip，非固定矩阵）+ 角色成员 + 操作日志 Tab；管理员管理。
  - 菜单管理：顶层按子系统维度，管理各系统菜单树（含子系统 CRUD）。
- **安全审计**：操作日志 / 登录日志，筛选检索、导出 CSV。
- **文件中心**：文件列表、上传、文件夹、预览抽屉（图片/PDF）。
- **消息中心**：独立页，已读/未读过滤。
- **系统设置**：企业信息；字典管理（左字典目录 + 右字典项，字典项状态用 switch）。
- **个人中心**：资料横幅 + 侧导航（个人信息/账号与安全/…）。

### 子系统 lastmile（尾程快递）—— 五层物流模型
关系链：**供应商接入 → 映射承运商服务 → 配置区域/价格/账号 = 一条可打单的物流渠道**。
- **运营概览**：业务指标卡 + 趋势。
- **运单管理**：运单列表（状态统计卡 + 状态 Tab 筛选 + 表格）、新建运单（收发件+包裹+渠道+费用预估）、运单详情（基本/包裹/费用/轨迹 Tab）、运单打单（面单预览 + 打印设置）、运单轨迹（时间线）。
- **终端客户**：客户列表 + 客户详情（余额/信用/使用率卡 + 基本信息/渠道授权/价格方案/账户流水 Tab）。
- **渠道管理**：物流渠道（五层模型列表 + 详情多 Tab + 新建级联表单）、承运商管理（DHL/DPD/GLS…）、供应商管理（新智慧/递四方/官方账号…）。
- **计费中心**：账单/对账。

## Design Tokens（CSS 变量，明/暗两套）
主色随「主题色」变化，示例为飞书风格浅色：
- `--pri`（主色）: 经典蓝 `#3370ff` / 陶土橙 `#c96442` / 深绿 `#16a34a` / 紫罗兰 `#7c3aed` / 自定义
- `--pri-soft`（主色浅底）: 如 `#eef3ff`（蓝）
- `--bg` 页面底: `#f5f6f7`（浅）/ `#111318`（暗）
- `--canvas` inset 画布: `#eceef1` / `#0c0d10`
- `--surface` 卡片/面: `#ffffff` / `#1b1d23`
- `--surface-2` 次级面(表头/输入底): `#f2f3f5` / `#262931`
- `--text` 主文字: `#1f2329` / `#e7e9ec`
- `--text-2` 次文字: `#4e5969` / `#a3aab3`
- `--text-3` 弱文字: `#8f959e` / `#7a818b`
- `--border` 边框: `#e5e6eb` / `#2c2f38`
- Claude 风格浅色另用暖米色系：surface `#fdfcf8`、chrome `#f4f1e8`、border `#e5e0d3` 等。

语义色：成功 `#16a34a`/底 `#e8f7ee`；警告 `#ff8000`/底 `#fff3e8`；危险 `#f53f3f`/底 `#feecec`；信息=主色。

字体：`"PingFang SC","Helvetica Neue","Microsoft YaHei",system-ui`。数字列加 `font-variant-numeric: tabular-nums`。
字号：正文 13–14px，表头 13px，页标题 22px，卡片数值 22–26px，弱说明 11–12px。
圆角：输入/按钮 8px，卡片 12px，大卡 14px，胶囊/头像 50%。
间距：页 padding 24–28px，卡片 padding 16–24px，栅格 gap 16px。
行高：表格行 56px，表头 44px，紧凑行 42–52px。

## 标准表格体系（务必抽成公共组件）
原型已抽出一套 `std*` 令牌，请在目标库对应实现为 `<DataTable>`：
- 面板：`1px --border` + `12px` 圆角 + `overflow:hidden`
- 表头：`44px` 高、`--surface-2` 底、13px `--text-3`，可 sticky
- 行：`56px` 高、`--border` 顶分隔、hover `--surface-2`、选中 `--pri-soft`
- 徽标 badge、复选框、行内「详情/编辑」主色链接、"···"更多
- 工具栏：搜索框(左) + 筛选 Tab + 右侧主按钮「＋新增」
- 分页：右下，当前页主色实底
所有列表页（成员、角色、日志、字典、渠道、承运商、供应商、运单、客户）都复用这套，确保视觉统一。

## Interactions & Behavior
- 导航点击切页；子系统切换换整套菜单。
- 抽屉/弹窗：右滑入 + 遮罩高斯模糊 `backdrop-filter: blur(6px)`；弹窗淡入上浮。
- Header 滚动时变毛玻璃吸顶（`backdrop-filter: blur(14px)` + 细分割线）。
- 侧栏子菜单展开用 grid `0fr↔1fr` 高度过渡（.26s）。
- 页面切换动画可选：无/淡入/切入/上滑/缩放。
- 表单：必填红星，禁用态按钮为主色淡化版 `color-mix(in srgb, var(--pri) 45%, var(--surface))`，填完变实底。
- 输入聚焦：白底 + 主色描边 + 柔光环。
- Toast 轻提示；开关 switch 即时生效。

## Files
- `后台管理脚手架.dc.html` —— 全部设计的唯一源文件（约 478KB，模板 + 逻辑类）。可直接在浏览器打开查看每个页面与交互；实现时对照其内联样式取精确值。

## Assets
无外部图片依赖。图标均为内联 SVG（lucide 风格），迁移用 `lucide-react` 同名图标。承运商 logo（DHL/DPD/GLS…）为文字色块占位，正式项目请替换为真实品牌 logo。面单条形码为 CSS 竖条占位，正式项目用条码库（如 `bwip-js`）。
