# 前端工程架构（权威文档）

本文档是当前脚手架的**现行工程约束与架构真相源**。当 README、历史 plan/spec 与本文冲突，以本文和当前代码为准；历史 plan/spec 中的旧路径仅代表当时执行记录。

> 配套：铁律速查见 `AGENTS.md`；可执行改造见对应 `SPEC-*.md`。
> 面向对象：维护者本人与协作 AI agent（Claude Code / Codex）。

## 0. 一句话架构

**样式向下收敛，数据向下请求，状态就近安放，一致性交给缓存。**

- 样式收敛：视觉细节固化在 `components/ui`（原语）与 `components/pro`（通用业务无关组件），业务层只写布局类。
- 数据下沉：服务端数据不在顶层统一请求下灌，而是「谁消费谁 `useQuery`」，靠 TanStack Query 的 key 去重与缓存复用避免重复请求。
- 状态就近：UI 状态住在「所有消费它的组件的最近公共父」（React 官方 lifting state），不无脑上提/下沉。
- 一致性靠缓存：跨组件数据同步经 `invalidateQueries`，不经 props 传数据。

## 1. 分层职责

| 层级 | 路径 | 职责 | 禁止事项 |
| --- | --- | --- | --- |
| App | `src/app` | Provider、QueryClient、Shell、布局注册、全局装配 | 放业务页面实现 |
| Config | `src/config` | 环境变量校验、应用默认路由、存储 key、feature flags、request 默认策略、外观默认值 | 放运行时用户状态、业务菜单、业务 DTO、页面权限实现 |
| Routes | `src/routes` | URL 协议、`staticData`、`validateSearch`、可选 loader、route context 适配 | 写页面 UI、写 Query/Mutation hook、发 toast、i18n 业务文案、直接依赖 module 子组件 |
| Business（纵切包） | `src/modules/<key>/<business>` | 一个业务域的全部：入口骨架、api、mocks、model、list/detail/form 场景 | 被跨业务复用、承载基础 UI 抽象 |
| Business API | `src/modules/<key>/<business>/api` | zod schema（唯一类型源）、query key factory、queryOptions、mutation hooks | 持有 React UI 状态 |
| Business Mocks | `src/modules/<key>/<business>/mocks` | MSW handler、mock 数据规则 | 被生产代码直接依赖 |
| UI | `src/components/ui` | shadcn/ui 基础原语 | 写业务权限、业务文案、业务请求 |
| Pro | `src/components/pro` | 后台通用业务无关组件（DataTable、Tree、表格壳、状态徽标、过渡容器…） | 绑定具体模块 DTO、import `@/modules/**`、`useTranslation` |
| Lib | `src/lib` | 纯函数、i18n、权限判断、图标注册、HTTP 基础设施 | 读写组件本地状态 |
| Stores | `src/stores` | token、外观、折叠态等纯客户端状态 | 存服务端数据副本 |

依赖方向只能自上而下：`routes → modules/<key>/<business> → components/pro + components/ui + lib`。`components/ui`、`components/pro` 不反向依赖模块页面。

**全局目录总览：**

```text
src/
├── app/            全局装配：providers / QueryClient(query.ts) / Shell / mount
├── config/         启动策略与默认值：env(唯一读 import.meta.env) / app / features / request / appearance
├── routes/         文件式路由「薄壳」：URL / validateSearch / staticData / loader / context
├── modules/<key>/  业务子系统，按业务域纵切。admin 为内核子系统
├── components/{ui,pro}
├── lib/            http(client/contract) / i18n / permission / icon-registry / utils
├── stores/         auth(token) / appearance
├── locales/  mocks/  styles/
```

### 1.1 脚手架核心 vs 示例业务（派生新项目 / 回流的边界）

派生新项目、或从脚手架回流修复时，按这条线区分（实例化清单见 `docs/NEW-PROJECT.md`）：

- **脚手架核心**（每个派生项目共享、回流价值高）：`app/`、`config/`、`lib/`、`components/{ui,pro}`、`stores/`、`styles/`、`routes/{__root,_auth,login,403}.tsx`。修 bug 主要落在这里，也是长期自有产品该 `git merge scaffold` 吃回来的部分。
- **示例业务**（每个派生项目替换、不回流）：`modules/admin/{users,roles,menus,dashboard}` 及其 mock 种子、`dashboard` 假数据。它们是「怎么写业务」的范本，新项目照 `users` 纵切结构重写，不保留示例数据。
- **原型 / 开发产物**（派生时删除）：`后台管理脚手架.dc.html`、`support.js`、`docs/design/research/`、`docs/baselines/`、`docs/日志/`、`docs/prototype-handoff.md`。

## 2. 业务纵切包（标准形态与范本）

模块内从「横切」（旧：`admin/{api,mocks,pages}`）改为「按业务域纵切」。一个业务域是一个自足包，结构固定，新业务**复制此骨架，不裁剪、不发明第二种形态**：

```text
modules/<key>/<business>/
├── index.tsx            # UI 骨架：布局 + Tab/分发，不拉数据、不持业务状态
├── api/
│   ├── schema.ts        # 唯一类型源：zod schema + z.infer
│   ├── keys.ts          # query key factory
│   ├── <resource>.ts    # queryOptions + mutation hooks（按资源拆）
│   └── index.ts         # 汇总导出（外部唯一入口）
├── mocks/{db.ts, <resource>.handlers.ts, index.ts}
├── model.ts             # 纯派生逻辑（不 import React）
├── types.ts             # UI 状态类型（非 api 推导类型）
├── list/                # 列表场景：Scene 编排 + Table + Tree/Toolbar + columns
├── detail/              # 详情场景：容器 + Tabs + 独立 detail query
├── form/                # 新建/编辑合一：Dialog + useXxxForm（RHF + zod）
├── components/          # 仅本包内 2+ 场景共享的 UI 碎片
└── __tests__/
```

约束：

- `index.tsx` 是页面唯一入口，只做布局与 tab/scene 分发；不持业务数据、不写 query/mutation。
- tab、panel、dialog、detail、form 必须拆成明确子组件，不堆在一个大组件里。
- 新建/编辑合并为 `form/`（共用一套 schema 与校验，用 `mode: 'create' | 'edit'` 区分），不使用 `isCreate/isEdit/isDetail` 布尔堆。
- `model.ts` 纯计算，不能 import React；`types.ts` 只放 UI 状态类型。
- **升级即终态**：无论业务简繁，都按此骨架建（简单页对应目录可仅一个文件或空）。用一点结构冗余换「零判断分支」。
- **归属决策树**：单场景用 → 该场景目录；本包 2+ 场景共享带 UI → `<business>/components/`；本包 2+ 场景共享纯逻辑 → `model.ts`；跨业务包共享 → `components/pro`(UI)/`lib`(逻辑)。禁止业务包内建 `utils/`/`helpers/` 抽屉目录。

### 2.1 为什么纵切 + 为什么 routes/modules 分离

- **纵切优于横切**：横切导致「改一个 user 需求要在 api/mocks/pages 三个平行目录间跳」。纵切把一个业务域的 api+mock+界面收进一个文件夹：改需求只动一处，删功能删一个目录。
- **routes 与 modules 为何两套（A 方案）**：不是冗余，是「路由壳」与「业务实现」分离。文件式路由（`autoCodeSplitting`）从 `routes/` 扫描生成路由树，路由文件必须存在；业务实现推到 modules，避免路由文件变怪物、且业务不被 URL 绑死、可独立测试复用。心智模型：**routes 回答「这个 URL 是什么、进来要准备什么、要什么权限」；modules 回答「业务怎么实现」。**

## 2.2 Config 边界

`src/config` 是脚手架启动策略和默认值中心，不是后台设置中心。

- `env.ts` 是唯一读取 `import.meta.env` 的源码文件；其他运行时代码必须通过 config 导出读取环境策略。
- `app.ts` 放应用默认路由、版本、locale、storage key 等框架级常量。
- `features.ts` 放 mock/demo/devtools 等 feature flags，避免开关散落在入口和页面中。
- `request.ts` 放 HTTP 默认策略和 envelope 字段约定，为接口契约层预留统一入口。
- `appearance.ts` 只放外观默认值；用户当前选择仍归 Zustand 和 localStorage。
- 禁止把业务菜单树、业务权限实现、DTO、表单字段、页面状态搬进 config。

## 3. Route 边界

Route 文件只做边界装配：

- `staticData` 写权限、菜单 label key、breadcrumb group key 和 action key。
- `validateSearch` 管 URL search 的输入协议（筛选条件存 URL，可分享/可后退/刷新不丢）。
- loader 只做首屏体验优化和可选预取；不是所有页面必须有 loader。
- Route 不写 `useQuery`、`useMutation`、`useQueryClient`、`useSuspenseQuery`、toast、i18n 业务文案。
- Route 从 `src/modules/<key>/<business>` 导入页面入口。
- Shell 稳定性属 App/Shell 层职责，业务页面不处理 Header/Sidebar 是否刷新。

## 4. 数据流与状态归属

### 4.1 数据下沉（组件自足）

顶层退化为 UI 骨架，不 `useQuery`、不持业务数据。每个场景组件自己请求自己的数据：

```
        queryClient（缓存 = 唯一数据真相）
         ▲            ▲              ▲
   deptsQuery     usersQuery    userDetailQuery
         │            │              │
     DeptTree     MembersTable   UserDetailPage
   （各自 useQuery；同 key 命中缓存则复用，去重不重复请求）
```

- 不同数据（部门/成员/详情）本就是不同请求，分开拉。
- 相同数据被多组件消费 → 各自 `useQuery(同一 queryOptions)`，第二个命中缓存、请求被去重。
- 顶层灌数据（prop drilling 一大坨 data）是反模式，禁止。
- 详情页重新请求全量（独立 `detailQuery(id)`，存 id 不存 dto），不复用列表行数据——详情字段通常比列表丰富。

### 4.2 状态就近（最近公共父）

UI 状态住在「所有消费它的组件的最近公共父」，不多不少：

| 状态 | 归属 | 理由 |
| --- | --- | --- |
| 表格行选择 / 分页页码 | `pro/DataTable` 内部 | 纯 UI，仅表格自身消费 |
| 表单草稿 / 校验 | 表单 hook（RHF） | 提交即弃，仅表单消费 |
| 弹窗开关 / 详情目标 / 删除目标 | 触发点与影响面的最近公共父（通常是 Scene，非顶层） | 触发在表格、影响面在场景 |
| 当前部门 deptId | Scene | 左树与右表的最近公共父 |
| 当前 tab | 页面入口 index | 三个 tab 面板的最近公共父 |
| 筛选条件（status/keyword/page/deptId） | URL search（路由层） | 可分享/可后退/刷新不丢 |
| 服务端数据 | queryClient 缓存 | 不 own 在组件，谁用谁 useQuery，按 key 复用 |

关键：**状态触发在子组件，不代表状态该住在子组件**；应放在触发点与所有受影响组件的最近公共父，既不上提到无关顶层，也不下沉到兄弟组件无法共享处。多个子组件共享同一块复杂状态时，把状态提升到最近公共父或专用 Provider，再经清晰 props/context 下发。

### 4.3 单向数据流

父 → 子：只经 props（data + 语义回调，如 `onView(user)`）。子 → 父：只经回调。**禁止把 `setState` 作为 prop 下传**——子组件不应知道状态如何存储，以便状态层可自由重构。组件内部函数按意图命名（`openCreateDialog`、`confirmDeleteRole`、`patchSearch`），不把业务动作藏在匿名大函数里。可复用组件优先接收 `children` 组合；仅列表渲染这类需回传数据的场景用 render prop。

## 5. 缓存模型（TanStack Query，务必理解）

这是「数据下沉」成立的地基。核心澄清：**「命中缓存」不等于「不再请求」**，而是「先用缓存垫界面 + 按条件后台校验刷新」（stale-while-revalidate）。

### 5.1 两个独立的时钟

- **staleTime（新鲜期）**：数据「多久内算新鲜、不后台重取」。默认 `0`——取回即 stale。fresh 期内纯读缓存、不发请求；stale 后仍先给缓存，但在触发条件下后台重取。
- **gcTime（回收期）**：无活跃观察者（组件全卸载）后，数据在内存保留多久，默认 5 分钟。与新鲜无关，只关内存。常识：`gcTime >= staleTime`。

### 5.2 「用缓存还是发请求」判定

- fresh（staleTime 内）→ 纯缓存，不发请求。
- stale（超 staleTime）→ 先给缓存，满足触发条件时后台重取。触发条件：组件重挂载、窗口重聚焦、网络重连、手动 `invalidateQueries`。
- 缓存不存在或已 gc → 硬加载，发请求。

### 5.3 多端修改如何保证看到最新

- 本端写操作：mutation `onSuccess` → `invalidateQueries` → 相关 query 立即 stale 并后台重取 → 秒变最新（最常见路径，100% 覆盖）。
- 他端写操作：本端在下一次 revalidate 触发时更新（聚焦/重连/手动刷新/任意 invalidate）。默认 staleTime:0 使这些时机几乎必然触发后台重取。
- 仅当 staleTime 设很长，才会在该窗口内看到旧数据——这是省请求与够新鲜的权衡旋钮，非 bug。

### 5.4 staleTime 分档策略

- 易变业务数据（列表/详情）：默认 `0`，靠 invalidate + 聚焦保新鲜。
- 准静态数据（部门树、字典、权限点）：设长 staleTime（如 5 分钟），省重复请求。
- 全局 `refetchOnWindowFocus` 当前关闭（后台系统避免频繁请求）：这削弱「切回标签页自动刷新」，使多端同步更依赖 mutation 失效与手动刷新。此为有意取舍，需知情。

### 5.5 key factory 是缓存复用前提

多组件按 key 取数，`queryKey` 必须逐字节相等才能复用缓存。因此每个业务包**必须**有 `api/keys.ts` factory，禁止内联字符串数组。key 不一致会导致「缓存不复用 + 各发各请求 + 数据看似不一致」——根因是 key 散写，非缓存机制。变更后按前缀失效（`invalidateQueries(xxxKeys.all)`）。

## 6. HTTP 契约

- `src/lib/http/client.ts` 负责统一请求、鉴权 header、timeout、abort、envelope 拆包、401 事件和错误归一。token 用绑定式 getter 注入，避免基础库反依赖业务。
- `src/lib/http/contract.ts` 是响应契约入口；后台接口必须通过 `defineApiContract({ response: Schema })` 声明运行时 response schema，响应用 `safeParse` 校验，字段漂移即早失败（`ContractError`）。
- 分页接口用 `pageResultSchema(ItemSchema)`，不各模块手写 `{ list, total }`。
- Module API 调 `http.get/post/put/patch/del` 必须传 response contract，**禁止** `http.get<T>()` 只靠 TypeScript 的写法（编译期无法证明运行时 shape）。
- DTO 类型只从 zod schema `z.infer`，DTO/mock/真实接口共用一份 schema；表单入参也用 zod schema 定义并与表单校验共用（RHF + `zodResolver`），字段对齐只有一处真相。

## 7. 状态模型（全局）

- 服务端数据归 TanStack Query（缓存模型见第 5 章）。
- URL 可分享状态归 TanStack Router search。
- 短生命周期 UI 状态（筛选、当前 tab、打开的 dialog、选中详情对象）按第 4.2 就近安放。
- token、主题、布局、侧边栏折叠等纯客户端全局状态放 Zustand。
- 禁止把服务端列表复制进 Zustand 再维护副本。

## 8. 组件设计

- `src/components/ui` 是基础 UI 体系入口，承接 token、尺寸、状态、无障碍和控件 API。页面不自己实现 Button/Input/Textarea/Select/RadioGroup/Tabs/Table/Dialog/Alert/Badge/Skeleton/Empty/Checkbox 等原子控件。
- 基础 UI 以 shadcn/Radix 源码模式维护在项目内；从 `@/components/ui/*` 引入的是项目本地组件。新增基础原语先查官方 shadcn（`pnpm dlx shadcn@latest docs <c>` / `add <c> --dry-run` / `--diff <file>`），无明确理由不从空白手写。已定制的基础组件不得直接 `--overwrite`；先看 diff 再把上游无障碍/组合/依赖合并进本地 token/variant。
- 样式定制优先级：全局 token / `@theme inline` → shadcn 组件 variant → `components/pro` 组合层 → 页面 className。页面层只做布局微调，不承担基础控件视觉定义。
- Button 标准变体 `primary`/`secondary`/`dashed`/`text`/`danger`/`danger-ghost`；`default`/`outline`/`ghost`/`link`/`destructive` 只作旧调用别名逐步迁移。
- Input 优先 `Input`；带前后缀用 `InputGroup*` 组合，错误态用 `status="error"` 或 `aria-invalid`。业务表单下拉统一 `SelectControl` / Radix Select，吃项目 token；`NativeSelect` 仅极少数需原生选择器场景。复杂表单优先 `Form` + `Field`/`FormField`，不在页面临时拼 label/错误/控件关联。
- `StatusBadge`/`SearchField`/`TableShell`/`DataTable`/`Tree` 这类后台通用组合必须复用 Badge/Skeleton/Empty/Checkbox 等原子件。`components/pro` 只沉淀业务无关后台模式组件，可组合 UI 组件，但不引入模块 DTO/接口/权限逻辑、不 `useTranslation`（文案由 props 注入）。
- 业务页面**通用表格/树/分页/选择/详情字段/表单弹窗**用 `pro`（DataTable/Tree/Pagination/DescriptionList/FormDialog…），只组装、填数据、传回调；**禁止**手写分页状态，行选择只能经 `DataTable` 的 selection API。
- **表格选型（唯一答案）**：业务表格一律用 `DataTable`（TanStack Table，受控行选择/分页）。`TableShell`（手写 CSS grid）是 roles/menus 迁移到纵切前的遗留，**新页面禁止使用**、迁移完成后退役——不要因为它在 roles/menus 里出现就当作可选范式。
- 页面层不直接写原生 `<button>`/`<input>`/`<select>`/`<textarea>`（除非作为新 UI/Pro 组件封装的实现细节）。组件样式只消费语义 token、Tailwind 语义类和 `--app-scale` 尺寸；页面不新增硬编码色值、任意圆角或脱离 token 的尺寸。
- 动画属组件契约：tabs 指示条、展开收起、加载骨架、按钮 pending 等沉到 UI/Pro 并提供 `motion-reduce` 降级；页面不写临时动画。

## 9. 主题 Token 纪律

主题体系五层：`Primitive/Semantic → UI Component State Tokens → Pro Component Tokens → Shell/Page Composition Tokens → Module Page Layout`。

约束：

- `src/styles/tokens.css` 是 token 定义唯一入口；组件只消费 token，不判断 `flavor`。
- UI 组件族用组件状态 token：`--field-*`、`--button-*`、`--option-*`、`--overlay-*`、`--tabs-*`、`--choice-*`、`--table-*`。Pro/Shell 用组合 token：`--pro-*`、`--side-list-*`、`--nav-item-*`、`--pagination-*`。
- 组件 token 不进 `@theme inline`，用 Tailwind v4 括号变量：`bg-(--token)`、`border-(--token)`、`text-(--token)`。状态优先级靠 `global.css` 声明顺序，不依赖 Tailwind 变体生成顺序。
- 业务页面不得用 `bg-pri-soft`、`text-pri`、`border-pri`、`ring-soft`、`hover:bg-surface-2` 等 primitive class 表达控件状态（guard 会拦）。通用 hover/focus/active/selected/expanded/open 状态必须沉到 UI 或 Pro 组件。
- 禁止 `rounded-[Npx]` 任意圆角；圆角走 `--radius-*`。禁止硬编码十六进制色值。

新增组件族流程：

1. 判断属 UI 原语 / Pro 组件 / 页面专属组合。
2. UI 原语先查 shadcn 官方与 Radix 合同，保留 Portal/focus/keyboard/aria/outside click。
3. 在 `docs/design/*.design.md` 或 spec 实测记录确认值来源；新增 flavor 先补 DESIGN.md 再回写值表。
4. 在 `tokens.css` 定义该族默认 token 与必要 flavor/mode 覆盖，不提前批量创建未消费 token。
5. 组件只消费该族 token；不把 primitive 状态 class 写进组件或页面。
6. 在 `/dev/theme-states` 补状态矩阵，覆盖默认、hover/focus 或 open、selected/active、disabled/invalid。
7. 补 `tokens.snapshot.test.ts` 和 `theme-guards.test.ts`；完成 token 化文件加入强约束清单。
8. 跑 `pnpm theme:guard`、`pnpm design:lint`、`tsc`、`vitest`、`eslint`，必要时用 Agent Browser 截三 flavor × light/dark。

> 复杂度提醒：组件族 token + 状态矩阵体系是本架构维护成本最高处。语义 token（禁硬编码）是绝对收益、务必保留；「每组件族独立变量 + 强制状态矩阵」若成为负担，是第一个可重新评估的对象。

## 10. 显示比例纪律

- 显示比例统一 `--app-scale` 乘法，不用 CSS `zoom`。精确 px 写 `calc(Npx * var(--app-scale))` 或沉到公共组件/token 层。
- 新增图表、虚拟表格、富文本、代码编辑器、地图、Canvas、第三方弹层等重组件，必须验证 90%/100%/108% 三档：尺寸随比例变化、portal 浮层定位正确、整页无溢出。
- Tailwind source 只扫 `src`；不让 `docs`/README/AGENTS 示例 class 进生产 CSS。

## 11. 纵向样板线

`users` 是第一条纵向样板线，证明「普通后台页面应如何组合基础组件」以及本文的数据流/状态归属。它是 roles/menus 及后续业务的复制范本。

约束：

- `users` 页面层禁止原生 `<button>`/`<input>`/`<select>`/`<textarea>`，控件从 `components/ui` 或 `components/pro` 组合；禁止 `style={{...}}`，树形缩进/页面 padding/表格 grid 等下沉到基础/Pro 组件。
- 页面入口只保留业务状态编排、权限判断、事件分发；数据请求下沉到场景组件（见第 4 章）。
- 搜索框、筛选下拉、分页、侧边列表、详情字段、表单弹窗、通用表格、树等先沉到 `components/pro`，再由 roles/menus 反向验证是否值得推广。

## 12. i18n / 权限 / mock

- 文案走 i18n key；禁止新增中文硬编码进组件。路由 `staticData` 用 `labelKey/groupKey/action.labelKey`。
- 前端权限只负责体验与防误触，不是安全边界；生产权限必须后端校验。
- mock 只在开发态/demo/`VITE_ENABLE_MOCK=true` 启用；生产构建必须剥离 faker/msw/mock worker。mock 随业务纵切（`<business>/mocks/`），在 `src/mocks` 总聚合挂载。

## 13. 约定即测试（守卫哲学）

架构约束不靠自觉，靠可执行守卫。凡本文架构不变量，均须有一条自动化断言守住（`src/app/__tests__/module-boundaries.test.ts` 等）：路由薄壳、api 必传 contract、env 只在 config 读、业务层不用裸 `<input>`、生产包不含 faker/msw、queryKey 来自 factory、index 无 query/mutation、pro 层不 import modules、纵切结构合规……新增架构规则的正确姿势：先加守卫测试，再让实现变绿。

主题门禁：

- `pnpm theme:guard`：token 快照、悬空 CSS 变量、违规 class baseline、状态页矩阵、模块边界测试。
- `pnpm design:lint`：校验三套 flavor 的 DESIGN.md；已知 warning 追溯 spec 白名单，新增 warning 不静默放过。
- CI 已显式运行 `theme:guard` 和 `design:lint`；新增 token/组件族/flavor 不允许只靠全量 `vitest` 顺带覆盖。
- `/dev/theme-states` 是主题验收入口；每个完成 token 化的组件族必须在此有可截图状态矩阵。

## 14. 新增/删除业务清单

**新增业务页：**

1. 建 `src/modules/<key>/<business>/`（index + api + mocks + model + list/detail/form）。
2. list/detail/form 场景与子组件按第 2 章骨架拆分。
3. 在 `src/routes/_auth/<key>/<page>.tsx` 只写 route 协议、可选 loader、URL/context 适配，从纵切包导入入口。
4. 补 `staticData` 的 i18n key、权限 code、action key。
5. 服务端数据走 `api/` 的 queryOptions/mutation hooks，数据请求下沉到场景组件。
6. 本地 loading/empty/error 在内容区处理，不让 Shell 随业务数据刷新。
7. `modules/registry.ts` 注册 manifest；`src/mocks` 总聚合挂 handlers；补 locales；新图标进 icon-registry。
8. 补页面测试与守卫；跑 `tsc`、`vitest`、`eslint`、必要时 `theme:guard`。

**删除业务页：** 删纵切包、删路由壳、registry 除名、删 locales namespace、从 mock 聚合摘除。`admin` 是内核子系统；登录/消息中心/个人中心是 Shell 入口依赖，不当普通业务页随意删除。

## 15. 反模式清单（明确禁止）

- 顶层 `useQuery` 后 prop drilling 把 data 灌给整棵子树。
- 把 `setState` 当 prop 下传给子组件。
- 弹窗/详情状态无脑堆在页面顶层（触发在表格却回传顶层开弹窗）。
- 业务组件绕过 `pro/DataTable` 手写分页状态、选择列或 checkbox 状态机（分页由 `DataTable` 内聚；行选择只通过 selection API 受控上提）。
- 内联 `queryKey: ['iam','users']` 字符串数组。
- 手写与 zod schema 重复的 DTO interface。
- `http.get<T>()` 泛型形式绕过运行时契约。
- 业务层出现视觉类 Tailwind（颜色/圆角/阴影/hover）或 `style={{...}}`。
- `isCreate/isEdit/isDetail` 布尔堆代替独立组件/显式变体。
- 为「简单页面」发明第二种目录结构。
- 过早抽象：一个模式出现不足 3 次就固化成通用组件/配置协议。
