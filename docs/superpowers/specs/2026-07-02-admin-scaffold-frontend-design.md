# 通用后台管理前端脚手架 — 设计文档

- 日期：2026-07-02
- 状态：待批准
- 上游输入：`README.md`（交接稿）+ `后台管理脚手架.dc.html`（高保真原型，唯一视觉基准）

## 1. 背景与目标

把 Claude Design 产出的单页面高保真原型（约 25 个页面、两个子系统、重度主题体系），落地为一套**可持续演进、可维护的前端工程模板**，作为后续若干项目的基础骨架。

**成功标准：**

1. 像素级还原原型的视觉与交互（颜色、间距、圆角、动效均以原型内联样式为准）
2. 新项目 `degit` 复制即可起步，接真后端时页面代码零改动
3. 加一个新子系统 / 新布局 / 新界面风格，都只需"新增文件 + 注册"，不修改既有代码
4. 界面上可动态管理子系统、菜单、权限（数据驱动，非代码写死）

## 2. 复用形态：模板仓库

脚手架是一个 **template repo**。每个新项目复制一份独立演进，升级不自动回流（接受此代价，换取最低工程复杂度）。由此推论：**模板中每处设计都会被复制 N 次，上游质量标准从严**。

不采用：monorepo 共享包（项目间耦合）、npm 私有包（维护成本过高）、微前端（过度工程化）。

## 3. 技术栈

| 层 | 选型 | 理由 |
|---|---|---|
| 构建 | Vite（SPA） | 后台无 SEO 诉求，静态产物配任意后端；不用 Next.js（SSR/RSC 白付成本）、不用 TanStack Start（2026-03 刚 1.0，过新且 SSR 用不上） |
| 语言 | TypeScript（strict） | — |
| 路由 | TanStack Router（file-based） | typed search params 精确命中 9+ 列表页的筛选/分页 URL 化刚需；与 Query/Table 同生态 |
| 服务端状态 | TanStack Query | 事实标准 |
| 表格 | TanStack Table（headless） | 自建 DataTable 的逻辑层 |
| UI | shadcn/ui + Tailwind CSS v4 | 与原型的纯 CSS 变量主题体系同构；源码在项目内，可自由魔改；不用 AntD（CSS-in-JS token 体系与像素级双风格复刻对抗） |
| 客户端状态 | zustand（+ persist） | 只管纯客户端状态：外观设置、auth、侧栏折叠 |
| 表单 | React Hook Form + zod | shadcn 标准搭配 |
| Mock | MSW | 网络层拦截，请求代码真实走通；切真后端零改动 |
| i18n | react-i18next | 原型要求中英切换，成熟标准 |
| 图表 | ECharts（薄封装，主题色联动） | 国内后台事实标准 |
| 图标 | lucide-react | 原型图标即 lucide 风格 |
| 测试 | Vitest + Testing Library（复用 MSW） | — |
| 包管理 | pnpm | — |

**状态边界铁律**：服务端数据全归 TanStack Query，zustand 只管纯客户端状态，两者不重叠。

## 4. 目录结构

```
src/
  app/                  ← 应用装配：providers、router 实例、Shell
    shell/
      layouts/          ← SidebarLayout / RailLayout / InsetLayout + registry
      widgets/          ← 布局无关部件：子系统切换器、导航菜单、Header 动作区、
                           用户菜单、外观设置抽屉、面包屑
  components/
    ui/                 ← shadcn 组件（复制进来的源码）
    pro/                ← 自建重组件：DataTable、PageHeader、DetailDrawer、
                           TreeSelect、Upload、StatusBadge…
  lib/                  ← http client、utils、icon registry
  stores/               ← zustand：appearance / auth
  modules/              ← 子系统
    admin/
      manifest.ts       ← 页面资源注册表 + 菜单种子数据
      api/              ← API 模块 + DTO 类型
      mocks/            ← MSW handlers
      components/       ← 子系统内部组件
    lastmile/           ← 同上（兼作"如何新增子系统"的活例子）
  routes/               ← TanStack Router file-based 路由（页面本体）
    _auth/              ← 鉴权布局（含 Shell），未登录重定向 /login
      admin/…
      lastmile/…
    login.tsx
  mocks/                ← MSW 启动装配（汇总各 module handlers）
  styles/               ← 主题 token（见 §7）
  locales/              ← i18n 资源（zh-CN / en-US）
```

URL 约定：第一段为子系统 key，如 `/admin/users`、`/lastmile/shipments/$id`。

## 5. 数据层

三层结构，依赖单向向下：

```
页面组件 → queryOptions 工厂 → API 模块（领域 DTO + 类型化函数） → HTTP client
```

**契约（定死在模板里）：**

- 响应 envelope：`{ code: number; data: T; message: string }`，`code !== 0` 抛业务异常（统一 toast），HTTP 层错误抛传输异常（401 → 跳登录；其余统一兜底提示）。新项目后端结构不同时，在 HTTP client 的 adapter（防腐层）归一化，改一处全站生效。
- 分页请求 `{ page, pageSize, ...filters }`，分页响应 `{ list: T[]; total: number }`。
- Query key 分层：`[领域, 资源, 参数]`，如 `['shipment', 'list', { status, page }]`；变更后按前缀失效。

**Mock：** MSW 按领域拆 handler（与 API 模块一一对应），faker 造数据 + 内存 CRUD（增删改在演示时真实生效，支持模拟延迟与错误）。环境变量 `VITE_ENABLE_MOCK` 控制开关；接真后端 = 关开关 + 配 `VITE_API_BASE_URL`。

## 6. 子系统机制

**分界线：代码注册"能力"，数据库管理"配置"。**

| 归属 | 内容 |
|---|---|
| 代码 | 页面组件、路由映射、页面所需权限点声明 |
| 数据（API/DB） | 子系统列表（key/名称/图标/颜色/启停/排序）、菜单树（层级/顺序/指向路由/挂权限点）、角色-权限分配 |

manifest 的两个角色：

1. **页面资源注册表**（永久）：本子系统有哪些页面（路由路径 + 名称 + 所需权限点）。菜单管理界面"新建菜单项"时从这份清单选页面。
2. **种子数据**（mock 期）：默认子系统信息与菜单树。**MSW 把它当数据库内容 serve**；Shell 只消费菜单 API，不直接 import manifest。接真后端时种子导成 SQL 初始化脚本。

```ts
interface SubsystemManifest {
  key: string;                    // 'lastmile'
  label: string;
  icon: string;                   // icon registry key，DB 可存
  color: string;
  home: string;                   // 默认落地路由
  pages: PageResource[];          // 页面资源注册表
  menuSeed: MenuNode[];           // 菜单树种子
}
interface PageResource {
  path: string;
  label: string;
  permission: string;             // 页面访问权限符：'admin:user:view'
  actions?: ActionPermission[];   // 页面内动作权限点（按钮级）
}
interface ActionPermission { code: string; label: string }
// 例：{ code: 'admin:user:create', label: '新建成员' }
//     { code: 'lastmile:shipment:export', label: '导出运单' }
interface MenuNode { label: string; icon?: string; path?: string; permission?: string; children?: MenuNode[] }
```

**权限符规范**：冒号分割三段式 `子系统:资源:动作`。页面访问权限约定动作为 `view`；动作权限如 `create` / `update` / `delete` / `export` / `detail` 等，按页面实际功能声明，不搞固定矩阵（与原型"模块分组 → 资源 → 可变动作 chip"的权限配置 UI 一致）。

"角色与权限"页的可配置项清单，就来自全部 manifest 聚合出的 资源 × 动作 树（代码声明的能力全集）；角色-权限的分配关系属于数据（DB/API）。

数据流（mock 与真后端同构）：`Shell → GET /api/subsystems + /api/menus →（MSW 读种子并支持 CRUD ｜ 真后端读 DB）`。登录后按用户权限集过滤菜单树，无权限菜单不渲染、直达路由则 403。

物理约束（明示，非缺陷）：页面组件必须先存在于代码中，界面上只能编排已注册页面，不能凭空造页面。图标经 icon registry（字符串 → lucide 组件）解耦。

## 7. App Shell：三层解耦

### 7.1 Design Token 层

五个正交外观维度，各自独立开关、互不感知、任意组合：

| 维度 | 取值 | 载体 |
|---|---|---|
| 风格 flavor | feishu / claude | `<html data-flavor>` 切换整套中性色 |
| 明暗 mode | light / dark | `<html data-mode>` |
| 主题色 | 4 预设 + 自定义取色 | JS 注入 `--pri` / `--pri-soft`（自定义色需运行时计算） |
| 圆角 | sharp / default / round | `--radius` 基准 × 分级 |
| 显示比例 | 90 / 100 / 110% | 根元素 `zoom`（沿用原型方案） |

Token 分级：primitive（原始色板，仅 token 文件内部使用）→ semantic（`--surface` `--surface-2` `--text` `--text-2` `--text-3` `--border` `--pri` `--pri-soft` + 语义色，即原型 README 那套）。

**铁律：组件只消费 semantic token，组件代码中禁止出现十六进制色值。** 像素级复刻 = 原型变量值原样搬入 token 文件；新增风格 = 新增一组变量。

页面切换动画（无/淡入/切入/上滑/缩放）与导航过渡沿用原型 keyframes，作为全局样式迁移。

### 7.2 布局层（策略模式）

```ts
interface ShellLayoutProps {
  menuTree: MenuNode[];          // 权限过滤后的菜单
  subsystems: Subsystem[];       // 切换器数据
  collapsed: boolean;
  header: ReactNode;             // Header 动作区（部件组合）
  children: ReactNode;           // 页面内容
}
```

`SidebarLayout` / `RailLayout` / `InsetLayout` 各自实现此接口，注册到 `layouts/registry.ts`。外观设置的"导航布局"读注册表。**新增布局 = 新文件 + 注册一行。**

### 7.3 部件层

子系统切换器、导航菜单、Header 动作区、用户菜单、外观设置抽屉、面包屑——布局无关，不感知自己的摆放位置。

数据流向明确为：**Shell 容器**统一发起菜单/子系统查询（TanStack Query），经布局 props 下发给切换器、导航菜单等数据部件；用户菜单、外观设置抽屉等自治部件直接读全局 store。依赖方向严格单向：**Shell 容器取数 → 布局摆放 → 部件呈现；部件与布局均不反向引用。**

## 8. 鉴权

- 登录页三 Tab（密码/短信/扫码）UI 全做，mock 阶段密码登录走通全流程，短信/扫码留 UI + mock 提示
- token 存 localStorage，HTTP client 统一注入 `Authorization` header（模板文档注明可切 httpOnly cookie 方案，需后端配合）
- 路由守卫：`_auth` 布局路由 `beforeLoad` 校验登录态，未登录带 `redirect` 参数跳 `/login`
- 401 统一处理：清 auth store → 跳登录；预留 refresh token 扩展点
- 权限：登录响应携带权限符集合（`string[]`），存 auth store。三级控制：
  1. **菜单级**：按权限集过滤菜单树（§6），无权限不渲染
  2. **页面级**：路由 `beforeLoad` 校验页面 `view` 权限符，无权限跳 403
  3. **按钮级**：`<AuthGuard permission="admin:user:create">` 包裹组件（无权限时不渲染，可配 `fallback` 为禁用态）+ `usePermission()` hook 供逻辑分支使用；DataTable 工具栏主按钮、行内操作、导出等全部挂权限符
- mock 阶段：MSW 按预置角色返回对应权限集，切换测试账号即可演示不同权限视图
- 边界说明：前端权限控制是**展示层体验**，不是安全边界——真正的鉴权必须由后端接口执行（模板 CLAUDE.md 中注明，防止新项目误把前端显隐当安全）

## 9. DataTable（核心公共组件）

原型 `std*` 表格体系的组件化，TanStack Table 做逻辑层：

- 视觉规格照原型：面板 1px 边框 + 12px 圆角、表头 44px `--surface-2`、行 56px、hover `--surface-2`、选中 `--pri-soft`、sticky 表头
- 组成：工具栏（搜索框 + 筛选 Tab + 右侧主按钮）、列定义（含徽标/主色链接/"···"更多列的预置渲染器）、行选择、右下分页（当前页主色实底）
- 状态外置：筛选/分页/搜索状态由页面经 typed search params 持有，DataTable 受控——列表视图可刷新、可分享 URL
- 内置 loading（骨架屏）/ 空态 / 错误态

所有列表页（成员、角色、日志、字典、渠道、承运商、供应商、运单、客户）复用此组件。

## 10. 交付范围

- **admin 子系统**：全部页面（企业概览、成员与部门、角色与权限、菜单管理、日志审计、文件中心、消息中心、企业信息、字典管理、个人中心）
- **lastmile 子系统**：全部页面（运营概览、运单列表/新建/详情/打单/轨迹、客户、渠道/承运商/供应商、计费）——兼作业务子系统范例
- **鉴权**：登录/注册/找回密码分屏页
- **外观系统**：五维度全部实现
- 承运商 logo 用文字色块占位、面单条码用 CSS 占位（照原型，README 已注明正式项目替换）

## 11. 测试与工程化

- 测试重点：`lib/`（http client/envelope 拆包）与 `components/pro/`（DataTable 等）单测 + 登录/列表 CRUD 少量集成测试（复用 MSW）；不追求覆盖率数字
- ESLint + Prettier、husky + lint-staged、GitHub Actions（lint + typecheck + test + build）
- `.gitignore` 覆盖 `.env*` / `node_modules` / `dist` / `.DS_Store`；根目录 `CLAUDE.md`（含本项目约定：token 铁律、状态边界、query key 约定、子系统新增步骤）
- 环境变量：`VITE_ENABLE_MOCK`、`VITE_API_BASE_URL`

## 12. 明确不做（YAGNI）

- 微前端、monorepo、npm 包发布
- SSR/SEO 相关一切
- 移动端适配（原型为桌面后台；表格页最小宽度 + 横向滚动兜底）
- 真实短信/扫码登录、真实文件存储（mock 走通交互）
- 主题编辑器之外的运行时 token 修改 GUI
