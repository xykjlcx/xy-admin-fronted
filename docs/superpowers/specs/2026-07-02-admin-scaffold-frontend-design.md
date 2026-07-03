# 通用后台管理前端脚手架 — 设计文档

- 日期：2026-07-02（v2，吸收三方对抗性 review 后重写）
- 状态：待批准
- 上游输入：`README.md`（交接稿）+ `后台管理脚手架.dc.html`（高保真原型，唯一视觉基准）
- ⚠️ 已证实交接稿 README 存在与原型代码不符之处（显示比例实现、档位系数、动画命名）。**冲突时以原型代码 grep 实证为准**，本文档标注了已知冲突点。

## 1. 背景与目标

把 Claude Design 产出的高保真原型（30 屏：27 个 shell 内页面 + 3 个鉴权屏，两个子系统，重度主题体系），落地为一套可持续演进、可维护的前端工程模板，作为后续若干项目的基础骨架。

**成功标准（均须可验收，验收方法见 §13）：**

1. 像素级还原原型的视觉与交互——基准限定：中文语言、100% 显示比例档；验收 = token 快照比对 + 视觉回归 diff + 交互 checklist
2. 新项目 degit 即起步；接真后端时**页面与 queryOptions 层零改动**（API 模块层允许按后端重写，见 §6）；验收 = 三个演练（§13.3）
3. 新增子系统 / 布局 / 界面风格 = 新增文件 + 有限注册点，不修改既有代码；验收 = 演练新增 demo 子系统后 git diff 只含新增文件与注册行
4. 子系统、菜单、权限可在界面上动态管理（数据驱动）

## 2. 复用形态：模板仓库

Template repo，每个新项目复制独立演进，升级不自动回流。缓解措施（低成本三件套）：

- 维护 `CHANGELOG.md`；模板版本号写入 `package.json`，degit 后可追溯 fork 基线
- `components/pro/` 与 `lib/` 保持自包含、互相低耦合——模板修 bug 后老项目可整文件 cherry-pick
- 模板 `CLAUDE.md` 记录全部铁律与操作清单（§14）

不采用：monorepo 共享包、npm 私有包、微前端。

## 3. 技术栈与浏览器基线

| 层 | 选型 | 备注 |
|---|---|---|
| 构建 | Vite（SPA） | 不用 Next.js / TanStack Start，理由见 v1 讨论记录 |
| 语言 | TypeScript strict | — |
| 路由 | TanStack Router（file-based） | typed search params + 路由树类型用于 manifest 收窄（§7.4） |
| 服务端状态 | TanStack Query | 含菜单/子系统/用户权限数据（§9） |
| 表格 | TanStack Table | DataTable 逻辑层 |
| UI | shadcn/ui + Tailwind CSS v4 | token 词汇裁决见 §8.1 |
| 客户端状态 | zustand + persist | 仅外观设置、token、侧栏折叠（per-layout） |
| 表单 | React Hook Form + zod | — |
| Mock | MSW 2.x | 剥离模式与启动时序见 §5.3 |
| i18n | react-i18next | 架构见 §11 |
| 图表 | 自研 SVG 图表组件（复刻原型） | **不引入 ECharts**——原型图表即手绘 SVG，模板不预付重图表库成本；复刻时修正原型渐变色不随主题联动的 bug（改用 `var(--pri)`） |
| 图标 | lucide-react + icon registry | registry：字符串 → 组件，DB 可存 |
| 测试 | Vitest + Testing Library + Agent Browser（视觉验收） | 不使用 Playwright；视觉截图与 diff 走项目本地浏览器工具链 |
| 包管理 | pnpm | — |

**浏览器基线：Chrome/Edge 111+、Safari 16.4+、Firefox 128+**。依据：原型自身使用 `color-mix()` 与 `backdrop-filter`；工程显示比例不使用 CSS `zoom`，改为 `--app-scale` token 乘法，避免 Radix/Floating UI portal 浮层出现双坐标系定位问题。不支持旧内核浏览器（360 兼容模式等），写入模板 README。

**状态边界铁律**：服务端数据（含菜单/子系统/用户与权限）全归 TanStack Query；zustand 只存纯客户端状态（外观设置、auth token、折叠状态）。§9 的 auth 设计遵守此律。

## 4. 目录结构

```
src/
  app/                    ← 应用装配：providers、router 实例
    shell/
      layouts/            ← SidebarLayout / RailLayout / InsetLayout + registry.ts
      widgets/            ← 布局无关部件（完整清单见 §8.3）
  components/
    ui/                   ← shadcn 组件源码
    pro/                  ← DataTable、PageHeader、DetailDrawer、IndentSelect（缩进下拉，
                             替代 TreeSelect——原型部门树无拖拽无勾选，勿镀金）、
                             Upload、StatusBadge、ConfirmDialog、I18nInput（§11.2）、
                             SvgChart（折线/柱条，复刻原型）
  lib/                    ← http client + adapter、utils、icon-registry、i18n 装配
  stores/                 ← appearance.ts / auth.ts（仅 token）
  modules/
    registry.ts           ← ★ manifest 聚合注册点（子系统增删的唯一注册文件）
    admin/
      manifest.ts         ← 子系统声明 + 菜单种子
      api/  mocks/  components/
    lastmile/             ← 同上；兼作新增子系统范例
  routes/                 ← file-based 路由；页面权限经 staticData 声明（§7.4）
    __root.tsx
    _auth/                ← 鉴权布局（Shell 在此）
      admin/…  lastmile/…
      403.tsx  404 由 notFoundComponent 提供
    login.tsx
  mocks/                  ← MSW 装配（browser.ts + db.ts 内存数据库）
  styles/                 ← tokens.css（§8.1）+ 动画 keyframes
  locales/
    zh-CN/{common,admin,lastmile}.json   ← per-module namespace（子系统可整目录删除）
    en-US/…
```

URL 约定：第一段为子系统 key。`modules/registry.ts` 是子系统唯一聚合点（review 发现 v1 未定义此文件导致"注册点在哪"悬空）。

## 5. 数据层

三层结构不变：`页面 → queryOptions 工厂 → API 模块 → HTTP client`。

### 5.1 契约

- 响应 envelope：`{ code: 0, data: T, message: string }`；业务异常（code≠0）统一 toast，传输异常分类处理（401 → §9）
- 分页：请求 `{ page, pageSize, ...filters }`，响应 `{ list: T[], total: number }`
- Query key：`[领域, 资源, 参数]`，变更后前缀失效

### 5.2 Adapter（防腐层）的完整职责边界

v1 只写了"响应归一化"，实测对接（如 RuoYi 系）需要三类归一，全部收敛在 `lib/http/adapter.ts` 单文件：

1. **请求侧**：参数名映射（`page → pageNum` 等）——queryOptions 拼参后、发出前统一改写
2. **响应侧**：多形状识别与归一（列表平铺形 `{code,msg,rows,total}` vs 普通形 `{code,msg,data}`）、code 语义映射（200 vs 0）
3. **权限符映射**（§7.5）

**诚实边界**：adapter 归一"形状"，归一不了"接口路径不存在 / 语义不同 / 一拆二（login+getInfo）"——那属于 API 模块层重写，此层允许按后端改动（成功标准 2 的措辞依据）。

### 5.3 Mock 机制

- **生产剥离模式（强制）**：入口用静态判断 + dynamic import。开发态默认启用 mock，demo 模式或 `VITE_ENABLE_MOCK=true` 显式启用；`VITE_ENABLE_MOCK=false` 可在开发态关闭。生产构建默认关闭 mock，Vite 构建期常量替换 + DCE + 构建后清理保证 msw/faker/种子数据/mock worker 不进生产包。**验收标准：生产构建产物 grep 不到 `faker|msw|mockServiceWorker`**
- **启动时序（强制）**：`await enableMocking()` 完成后再 mount React——TanStack Router 的 beforeLoad/loader 在 worker ready 前发请求必挂
- faker 放 dependencies（被 src 引用）；`public/mockServiceWorker.js` 仅用于开发/演示，生产构建后必须移除
- 构建脚本：`build`（生产，mock off）/ `build:demo`（演示站，mock on）
- mock 内存 DB（`mocks/db.ts`）：**关系型**，覆盖约 20 个资源域（用户/部门/角色/权限/日志×2/文件/消息/字典/子系统/菜单/运单+轨迹/客户+授权+流水/渠道→承运商→供应商三层关联/账单/概览统计×2），faker 种子 + 增删改真实生效 + 可选 localStorage 持久化（演示站体验）。**此块为独立工作包，估算占总量 ~12%，勿轻估**

## 6. 后端接口契约（新增章节）

**模板交付一份成文契约，作为 mock 与真后端的共同上游**（v1 的契约只活在 mock 代码里，违反接口先行，review R1）。交付物：

1. `docs/api-contract.md`：endpoint 清单 + 请求/响应 DTO 索引（TS 类型为权威源，文档生成/链接）。覆盖：auth（login / me / logout / refresh）、subsystems CRUD、menus CRUD、users/depts、roles + 角色-权限读写（保存形状：权限符 `string[]`）、admins、logs×2 + 导出、files + 上传（multipart，envelope 外例外协议）、messages、dicts、profile、lastmile 全域（shipments/customers/channels/carriers/suppliers/billing/stats）
2. **AuthProvider 契约**（接口先行，把"一步还是两步登录"藏进实现）：

```ts
interface AuthProvider {
  login(dto: LoginDto): Promise<{ token: string }>;
  fetchProfile(): Promise<{ user: UserInfo; roles: string[]; permissions: string[] }>;
  logout(): Promise<void>;
  refresh?(): Promise<{ token: string }>;
}
```

3. **参考 DDL**（subsystem / menu / role / role_permission 四表，含 JSON label 列）+ `scripts/export-seed.ts`（manifest 种子 → SQL INSERT，薄脚本）

## 7. 子系统机制

分界线不变：**代码注册能力，数据管理配置**。以下为 review 后的修正。

### 7.1 数据模型（修正：v1 的 MenuNode 撑不起菜单管理 CRUD）

```ts
type LocalizedString = Record<string, string>;   // { "zh-CN": "运单管理", "en-US": "Shipments" }
                                                  // DB 存 JSON 列；加语言不改表结构

interface Subsystem {
  key: string; label: LocalizedString; desc: LocalizedString;
  icon: string; color: string; home: RoutePath;
  builtin: boolean;            // 内置不可删（admin）
  enabled: boolean;            // false = 切换器上"即将上线"占位；M0 不预置未来子系统，后续按注册清单逐个加
  sort: number;
}

// 管理行形状（菜单表 DTO，菜单管理页 CRUD 的对象）
interface MenuRecord {
  id: string; parentId: string | null; subsystemKey: string;
  type: 'dir' | 'menu' | 'action';   // action 型 = 按钮权限行（对接 RuoYi 式菜单表时使用；
                                      // 模板自身种子只用 dir/menu，按钮权限走 manifest actions）
  label: LocalizedString;
  icon?: string;                      // dir 与 menu 均可挂（inset 布局叶子需要图标）
  shortLabel?: LocalizedString;       // rail 布局的短标签（原型 NAV.short）
  path?: RoutePath;                   // menu 型必填
  permission?: string;
  visible: boolean; sort: number;
}
// 渲染树形状 = MenuRecord 按 parentId 组树 + 权限过滤 + visible 过滤后的产物，仅 Shell 消费
```

**菜单深度约束（明文）**：导航树最大两级（dir → menu），rail 布局的"组→页"模型结构性放不下第三级；菜单 API 校验，action 型不进导航渲染。

### 7.2 菜单编辑器（决策：一次做到位）

原型中菜单项增删改均为 toast 桩，编辑器属**新增设计，无原型视觉基准**：表单（I18nInput 双语名/图标选择/类型）+ 从页面资源清单选路由 + 排序 + 校验（深度/路径存在性/权限符格式）。验收标准："与全站设计语言一致"（线框级），不适用像素级条款。原型 MENU_TREE 种子自身的不一致（finance 树无对应子系统、路径体系脱节）**不复刻**，种子数据以修正后的一致版本为准。

### 7.3 子系统编辑器沿用原型（subEditor 是真实现），删除等破坏性操作统一加 ConfirmDialog（原型缺失，模板补齐）。

### 7.4 路由 × 菜单闭环（修正：焊死最后一环）

- **权限元数据单一真相在路由文件**：每个路由用 TanStack Router `staticData` 声明 `{ label, permission, actions, group }`；**页面资源清单从路由树推导**（不再在 manifest 手写 pages 数组），路径与权限永不脱钩
- `RoutePath` = 路由生成文件导出的联合类型；manifest 菜单种子的 `path` 用它收窄——**种子里的路径 typo / 路由改名 = 编译错误**
- DB 存量菜单（运行时数据）兜底：dev 启动断言"菜单路径 ⊆ 路由树"；菜单管理界面对孤儿路径标红
- 约定：beforeLoad 权限拒绝只 `throw redirect()`，禁止 toast 副作用（`defaultPreload: 'intent'` 下 hover 即触发 beforeLoad）

### 7.5 权限模型（修正：对齐原型 + 兼容真实后端）

- 权限符三段式 `域:资源:动作`。**统一裁决**（v1 规范与原型种子分裂）：采用原型种子的**业务域前缀**风格（`iam:user:view`、`audit:oplog:view`），动作命名向原型对齐（`del/resetpwd/assign` 等按原型，新增的取通用名）
- **一页多资源**：staticData 的 actions 允许携带异资源前缀（成员与部门页挂 `iam:user:*` + `iam:dept:*`）；`group` 字段提供"模块"分组标签（角色权限配置页的三层 UI：模块→资源→动作，照原型）
- **通配符匹配（强制支持）**：`usePermission` 实现 `*:*:*`、`iam:*` 段通配——RuoYi 系超管返回 `["*:*:*"]`，纯字符串相等会导致超管全站 403
- **权限符映射扩展点**：adapter 提供 `mapPermission(backendCode) => templateCode` 钩子（一张映射表），后端符号体系不同时改一处
- **权限目录 source of truth 双模式**（写入 CLAUDE.md）：模板模式 = 路由树 staticData 聚合为目录，后端只存分配关系；对接模式 = 后端 permission/menu 表为准，前端 staticData 仅作声明校验

### 7.6 子系统操作清单（CLAUDE.md 之源）

**新增（7 步）**：① `modules/<key>/` 建 manifest/api/mocks；② `routes/_auth/<key>/` 建页面（staticData 声明权限）；③ `modules/registry.ts` 注册 manifest；④ `mocks/browser.ts` 挂 handlers；⑤ `locales/*/<key>.json` 建 namespace；⑥ 新图标进 icon-registry；⑦（真后端）种子入库。
**删除（4 步）**：删 `modules/<key>/` + 删 `routes/_auth/<key>/` + registry 除名 + locales 删 namespace。
**admin 内核页标注**：Shell widgets 依赖消息中心与个人中心（铃铛/头像菜单直达），此二页 + 登录属不可删内核，在 CLAUDE.md 标注。

## 8. App Shell

### 8.1 Design Token 层（修正："正交"降级为"受控耦合"）

五个外观维度 + **耦合矩阵**（原型实证，v1 宣称的完全正交不成立）：

| 维度 | 载体 | 耦合规则（照原型） |
|---|---|---|
| flavor（feishu/claude） | `<html data-flavor>` | 切换时**重置主题色**为 flavor 默认（feishu→经典蓝，claude→陶土橙） |
| mode（light/dark） | `<html data-mode>` | 暗色下 `--pri-soft` 固定 `rgba(255,255,255,.08)`，**与主题色无关** |
| 主题色 accent | JS 注入 `--pri`/`--pri-soft`/`--pri-hover` | 亮色下 soft：预设色用手调值，自定义色用 `rgba(pri,.12)` 公式；`--pri-hover` 用 `color-mix(in srgb, var(--pri) 85%, black)`（修正原型硬编码深蓝的 bug） |
| 圆角 | `--radius-factor`（0.28/1/1.55）+ `--app-scale` | 全套 `--radius-N: calc(Npx * var(--radius-factor) * var(--app-scale))` 乘法 token（shadcn 默认加法偏移与原型乘法不等价）；**禁用 `rounded-[Npx]` 任意值**（ESLint 约束） |
| 显示比例 | `--app-scale`，档位 0.9/1.0/1.08（原型实际系数，README 的"110%"有误） | 独立维度。**决策记录**：废弃 CSS `zoom`，原因是 `getBoundingClientRect` 返回视觉像素、`offset*` 返回未缩放像素，Radix/Floating UI portal 浮层会进入双坐标系；改用 token 乘法后，spacing/text/radius/关键 px 尺寸统一乘 `--app-scale`，portal 浮层同样继承。像素验收基准限定 100% 档；90/108 档验"无溢出/无截断/浮层不出视口"。 |

**Token 权威源是原型代码 L4796-4808 的 FLAVORS 对象**（2 flavor × 2 mode × 12 变量），不是 README。补齐 v1 遗漏：`--bg / --canvas / --chrome`（侧栏与 Header 底色，飞书白/Claude 米）`/ --surface-blur`（毛玻璃底）。

**shadcn 词汇裁决**：`@theme` 中把 shadcn 变量（`--background/--card/--popover/--muted/--accent/--ring/--input`…）alias 到原型语义 token（`--bg/--surface/--surface-2/--pri-soft/--pri/--border`…），实现期产出完整映射表并冻结；**铁律：业务代码只准使用原型语义 token；组件代码禁止十六进制色值**（ESLint/grep 进 CI）。

**显示比例接入纪律（基础层收敛）**：业务页面优先使用 Tailwind 默认 spacing/text/radius 与 `components/pro` 组件，默认会吃到 `--app-scale`；确需精确任意 px（如原型级宽高、图标、定位）必须写成 `calc(Npx * var(--app-scale))` 或沉到公共组件 token。新增重组件（图表、虚拟表格、富文本、代码编辑器、地图、Canvas、第三方弹层）必须在接入 PR 中检查 90/100/108 三档：尺寸是否随比例变、portal 浮层是否定位正确、是否出现整页溢出。第三方内部尺寸不天然吃本项目 token，不能默认为已适配。

**Tailwind source 边界**：`global.css` 的 `@import 'tailwindcss' source('../')` 刻意把扫描范围限定在 `src`。不要让 `docs`、README、AGENTS 中的示例 class 进入生产 CSS；否则会生成 `rounded-[Npx]`、旧 px 示例等无效/误导性 utility，干扰体积和审查。

**FOUC 防护**：`index.html` 内联脚本在样式加载前读 localStorage 写 `data-flavor/data-mode`（zustand persist 恢复晚于首帧，暗色用户否则每次刷新闪白）。可选：storage 事件跨 tab 同步。

### 8.2 布局层（修正：契约重写）

v1 的 `header: ReactNode` 大 prop 拆不开"inset 布局把子系统切换器搬进侧栏"（原型实证：两处切换器弹层规格不同），废弃。修正：

```ts
interface ShellLayoutProps {
  menuTree: MenuNode[];              // 渲染树（已过滤）
  subsystems: Subsystem[];
  collapsed: boolean;                 // per-layout：stores 按 Record<layoutKey, boolean> 存
  onCollapsedChange(v: boolean): void;
  children: ReactNode;                // 仅页面内容
}
```

**布局直接 import 部件并自行组合**——部件不感知位置，"位置知识"归布局（这才是原型真实结构：sidebar 布局把切换器放 Header 左上、inset 放侧栏顶，同一部件不同摆位与弹层规格由布局传参）。"新增布局 = 新文件 + registry 注册一行"仍成立，成立条件即"布局自由组合部件"。

### 8.3 部件层（补全 v1 遗漏的 Header 碎片件）

完整清单：SubsystemSwitcher（弹层规格可参数化）、NavMenu（sidebar 组树 + grid 0fr↔1fr 过渡 / rail 短标签 + 二级面板 / inset 平铺，三形态组件）、**GlobalSearch**（Header 440px 搜索框，v1 遗漏）、**DarkModeToggle**（Header 快捷钮，与外观抽屉状态同源）、**NotificationBell**（未读徽标，点击直达消息中心）、UserMenu（含 5 个 stub 项照原型保留为 toast）、AppearanceDrawer（全部外观项）、Breadcrumb（菜单树 + 路由 staticData.label 兜底——详情页不在菜单树）、LanguageMenu。
**Header 行为**：滚动毛玻璃吸顶（`--surface-blur` + blur(14px)；inset 布局未滚动时 header 透明），照原型。
页面切换动画五种，命名照原型实际：无/淡入/**左滑**/**上浮**/缩放。

## 9. 鉴权（修正：遵守自己的状态铁律）

- zustand 只存 **token**；用户资料 + roles + permissions 走 `GET /api/me` 的 Query（`['auth','me']`）——v1 把权限集存 zustand+localStorage 是铁律的第一个违反者（F5 后权限过期到下次登录）
- `_auth` 布局 `beforeLoad`：`queryClient.ensureQueryData(meQuery)`；未登录 `throw redirect({ to: '/login', search: { redirect } })`
- **登录/登出/权限变更后显式 `router.invalidate()`**（TanStack Router 不因 store 变化重跑 beforeLoad，标准坑）
- 401：http client 发布 `auth:expired` 事件，app 层订阅后清 token + invalidate + 跳登录（事件解耦，避免 http↔router 循环 import）
- 403 页、404（notFoundComponent）进交付清单
- 登录页三 Tab UI 全做，密码流走通，短信/扫码 UI + mock 提示
- 三级权限控制（菜单过滤 / beforeLoad / `<AuthGuard>` + `usePermission` 含通配符）见 §7.5；mock 预置多角色账号切换演示

## 10. 列表页与 DataTable 抽象策略

**2026-07-03 执行期修订：不再先抽象 DataTable。** M0 的下一步先把"成员与部门"这个具体界面做出来，用真实页面压力校验表格、部门树、筛选、分页、批量操作、行操作、权限按钮、详情抽屉、确认弹窗、typed search params 与 mock CRUD 的边界；等该页跑通并通过验收后，再决定哪些部分值得沉到 `components/pro`。

**2026-07-03 像素级补充：** 成员页视觉以 `后台管理脚手架.dc.html` 的 USER MANAGEMENT 与 STANDARD TABLE SYSTEM 为准：外层 `pageWrapStyle`、`contentPanelStyle`、tabs、248px 左部门树、`stdThead/stdRow/stdBadge/stdCheck`、成员 seed 与状态语义都按原型落地；不得用普通后台双卡片布局替代。

**2026-07-03 成员页复盘结论：** `/admin/users` 已证明"表格视觉壳、行高/表头/空态/分页槽位、状态徽标、确认弹窗"具备稳定边界，可以沉到 `components/pro`；但"部门树、成员状态流转、权限按钮、批量动作、URL search params、query invalidation、行操作菜单"仍强绑定成员页业务，不进入通用组件。当前不抽 `DataTable v1`：如果现在定义 columns DSL、内置查询协议、内置选择/批量/toolbar，只会把一个页面的业务耦合搬进配置层，不能让下一个页面明显更简单。

执行原则：

- **先页面，后抽象**：`/admin/users` 先允许页面内局部实现表格结构和工具栏，不预设一个通用 `<DataTable>` API。抽象必须来自已跑通的真实交互，而不是从原型 std* 规格直接脑补。
- **状态边界不变**：筛选、分页、当前部门、关键词等可分享状态仍走 TanStack Router typed search params；服务端数据仍走 Query；选中行、弹窗开关、表单草稿等纯 UI 状态留在页面局部。
- **Task 16 裁决**：抽轻量 `TableShell`、`StatusBadge`、`ConfirmDialog`，只负责视觉与确认交互；不接管数据请求、URL、列 DSL、权限、批量动作或行菜单。详情抽屉暂不抽，当前只有成员资料这一种形态，抽出去不会降低复杂度。
- **不做过早通用化**：M0 不为尚未出现的列表页预留复杂列 DSL、内置查询协议、导出协议或全量 toolbar 配置。后续如果角色、日志、文件等页面复用同一模式，再抽 `DataTable v1`。

如果后续真的抽 `DataTable v1`，最小 props 只能来自两个以上真实页面：`columns`、`rows`、`rowKey`、`pagination`、`selection`、`empty`、`toolbar`。明确不做：内置 TanStack Query、内置 Router search params、内置权限判断、内置业务批量动作、内置导出/列设置/复杂筛选。

成员页稳定后再抽象的最低条件：

1. viewer / admin 权限差异可验收，按钮级入口不越权。
2. 部门树、状态筛选、关键词、分页刷新不丢，URL 可复制复现同视图。
3. 新建、删除、批量禁用等 mock 写操作真实影响列表。
4. loading / empty / error / selected 状态都有页面级覆盖。
5. 90% / 100% / 108% 显示比例下表格、抽屉、弹窗无截断和 portal 定位偏移。

## 11. i18n（新增章节）

### 11.1 静态文案
- react-i18next，per-module namespace（§4）；key 规范 `<ns>.<page>.<label>` 在 M0 定稿，**页面开发时直接写 t(key)**，禁止先硬编码后补
- **事实与预期管理**：原型语言切换是 toast 桩，全站 0 条英文——约 1100 条英文文案从零撰写，占总工作量 ~9%，排 M2；英文态验收 = "无溢出/无截断巡检"（英文更长，像素基准仅中文态）

### 11.2 数据侧（决策：JSON 节点）
- 所有需多语言的数据字段（菜单/子系统/字典的 label、desc）类型为 `LocalizedString`（JSON 列），加语言不改表
- 读取：按当前 locale 取值，fallback 链 `当前语言 → zh-CN → 首个非空`
- **`<I18nInput>` 公共组件**：输入框 + 地球图标按钮 → 弹窗编辑各语言键值对，默认展示当前语言值；菜单/子系统/字典编辑表单统一使用（通用性由组件解决，不摊向每个表单）

### 11.3 剥离立场（写入 CLAUDE.md）
不需要英文的新项目：保留 t() 层、只维护 zh-CN 资源；**不要**拆 react-i18next。

## 12. 交付范围

- 30 屏全量：admin 27 屏内含消息中心/个人中心/sub_home 占位页（未启用子系统落地页，含"去菜单管理"入口）；lastmile 全页；登录/注册/找回
- 子系统切换器支持 `enabled:false` 的"即将上线"展示；M0 只交付 admin 单子系统，HR/CRM/Project/Data 等未来模块不预置空壳，后续按 §7.6 注册清单逐个加入
- 菜单编辑器一次做全（§7.2）；子系统编辑器照原型
- 面单打印：`window.print()` 最简实现 + 面单区域打印样式；热敏纸精确适配留真项目
- 文件预览抽屉 = 占位交互照原型（防镀金标注）；承运商 logo 文字色块、条码 CSS 占位照原型
- 403/404 页

## 13. 验收体系（新增章节）

1. **Token 快照（确定性）**：FLAVORS 12 变量 × 4 组合逐值断言，`--app-scale` 三档、spacing/text/radius 乘法逐值断言，零成本硬验收
2. **视觉验收**：Agent Browser 驱动原型（单 HTML 可 state 切换）产基准截图；实现侧同 viewport 产截图与 diff 报告。M0 默认覆盖 dashboard / users / login 三屏与 90% / 100% / 108% 显示比例浮层检查；后续 M1/M2 扩到全屏与 pairwise 主题矩阵。正交性主要由"构造保证"（token 铁律 CI 强制），不靠目检 2700 组合
3. **三演练**：① fresh degit → pnpm i → dev 全功能；② 照 §7.6 清单新增 demo 子系统，diff 仅新增文件+注册行；③ 关 mock 指向最小假后端，页面层 0 diff
4. 交互 checklist：README Interactions 段逐条人工核对
5. 生产包检查：构建产物 grep 不到 `faker|msw|mockServiceWorker`

### 13.1 UI 复刻度验证：截图像素 diff 的定位

截图像素 diff 是 UI 视觉层的强证据，用于量化实现对原型的复刻度与回归风险。它回答的是"同一页面、同一状态、同一 viewport 下，有多少像素发生了超过阈值的差异"，不回答权限、数据闭环、交互完整性或架构质量。

执行规则：

- **同源基线**：原型截图必须来自视觉权威源，并在截图前断言页面状态已正确切换；不能只截图不校验文本/状态。
- **同环境约束**：实现侧与原型侧必须使用相同 viewport、主题、布局、显示比例、登录态和业务状态。
- **同工具链**：优先使用 Agent Browser 采集截图与生成 diff；不引入 Playwright 作为本项目视觉验收依赖。
- **量化方式**：记录 `different pixels / total pixels * 100%`，并保留 diff 图。百分比用于发现回归和排序风险，最终仍需结合 diff 图判断差异性质。
- **阈值原则**：0% 不是唯一目标。字体抗锯齿、阴影、渐变可能产生非实质差异；但布局错位、内容错屏、缺失控件、状态错误必须修复。
- **功能优先边界**：不得为了追求低 diff 恢复无真实流程的假按钮，也不得删除 M0 已实现的真实功能入口；此类差异必须在报告中注明原因。
- **沉淀要求**：每次 UI 复刻类任务至少产出基线截图、实现截图、diff 图、百分比和人工结论；关键结论同步到任务文档，而不是只留在被忽略的 `test-results/` 目录。

## 14. 测试与工程化

- 单测重点：lib/http（envelope/adapter/权限通配符匹配）、pro 组件；集成：登录流 + 列表 CRUD（复用 MSW）。**测试边界声明**：MSW 测试验证的是"前端遵守契约"，不验证后端遵守——契约变更时 mock 同步更新是纪律
- ESLint（含禁 hex 色值、禁 rounded 任意值两条自定义规则，后续可扩展裸 px 检查）+ Prettier、husky + lint-staged、GitHub Actions：lint + typecheck + test + build + token 快照
- 模板 CLAUDE.md / AGENTS.md 内容清单：token 铁律 / `--app-scale` 显示比例接入纪律 / 状态边界 / query key 约定 / 子系统增删清单 / 权限双模式 / i18n 剥离立场 / 前端权限非安全边界 / mock 剥离验收
- `.gitignore` 覆盖敏感与产物文件；环境变量 `VITE_ENABLE_MOCK` / `VITE_API_BASE_URL`

## 15. 分期（按上游杠杆定律切）

- **M0 骨架期（模具，返工放大系数最高）**：token 体系全量（含耦合矩阵、`--app-scale` 显示比例、--chrome/--surface-blur）→ 三布局 Shell + 全部 widgets + 外观抽屉 + 切页动画 → 路由/鉴权/401/403/404 + envelope + MSW 装配（启动时序）→ 菜单数据流（Shell 只吃 API）+ registry + staticData 机制 → i18n 架构（key 规范 + LocalizedString + I18nInput）→ **成员与部门页先行**（树+表+抽屉+弹窗+批量，逼出真实列表页边界）→ **基于成员页复盘抽 DataTable / pro 组件** → CI + token 快照 + Agent Browser 视觉验收脚手架 + 基准截图脚本 → **显示比例三档浮层实测**
- **M1 量产期**：admin 余页 → lastmile 全页（playbook 复制）→ 三级权限落地 → SVG 图表组件 + 两个概览页 → 登录三屏 → 菜单编辑器
- **M2 收尾期**：i18n 全量词条 + EN 巡检 → 打印样式 → 视觉验收全矩阵跑批 → CLAUDE.md/文档 → 三演练验收

工作量结构预警（review 实测盘点）：页面本体 <1/3；Shell+主题 ~18%、pro 组件 ~15%、**mock 关系数据层 ~12%**、i18n ~9%、验收工具链 ~6% ——后三项 v1 均一句话带过，勿再低估。

## 16. 明确不做（YAGNI）

微前端 / monorepo / npm 包发布、SSR、移动端适配（最小宽度 + 横向滚动兜底）、真实短信/扫码/文件存储、ECharts 等重图表库、热敏打印精确适配、TreeSelect 拖拽勾选树（原型无此交互）、运行时 token 编辑 GUI。
