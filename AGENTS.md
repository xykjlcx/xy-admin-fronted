# AGENTS.md — 通用后台管理脚手架前端规则

> AI agent(Claude Code / Codex)每次会话的执行规则。权威解释见 `docs/ARCHITECTURE.md`;具体改造见对应 `SPEC-*.md`。
> 冲突时优先级:**当前代码 > docs/ARCHITECTURE.md > 本文 > 历史 plan/spec**。

## 项目定位

- Vite + React + TypeScript + Tailwind CSS v4 + shadcn/ui + TanStack(Router / Query / Table) 的企业后台管理模板。
- 高保真视觉基准:`后台管理脚手架.dc.html`。当 README 与实现方案冲突,以 `docs/superpowers/specs/2026-07-02-admin-scaffold-frontend-design.md` 和当前代码为准。
- 交付形态:此仓库作为脚手架范本,新业务域复制既定纵切结构开发(见「模块纵切」)。

## 全局目录总览(先建立地图)

```text
src/
├── app/            全局装配:providers / QueryClient(query.ts) / Shell / mount。不放业务页面
├── config/         启动策略与默认值:env(唯一读 import.meta.env) / app / features / request / appearance
├── routes/         文件式路由「薄壳」:URL 协议 / validateSearch / staticData / loader / context
├── modules/<key>/  业务子系统,按业务域「纵切」(见下)。admin 为内核子系统
├── components/
│   ├── ui/         shadcn/ui 原语
│   └── pro/        后台通用、业务无关组件(DataTable / Tree / TableShell / Pagination / StatusBadge …)
├── lib/            纯函数与基础设施:http(client/contract) / i18n / permission / icon-registry / utils
├── stores/         纯客户端状态(zustand):auth(token) / appearance。不存服务端数据副本
├── locales/        i18n 资源
├── mocks/          MSW 总聚合与 browser 装配(各业务 handler 随业务纵切,在此汇总挂载)
└── styles/         全局样式与 token
```

依赖方向只能自上而下:`routes → modules/<key>/<business> → components/pro → components/ui`,横向经 `lib`。
`components/ui`、`components/pro` **禁止**反向 import `@/modules/**`。

## 分层边界

- **routes 是薄壳**:只做 URL / `validateSearch` / `staticData` / loader / route context 适配。**禁止** `useQuery` / `useMutation` / `useQueryClient` / `useSuspenseQuery` / `from 'sonner'` / `useTranslation` / 直接依赖业务子组件。
- **config 是启动中心不是设置中心**:`env.ts` 是唯一读 `import.meta.env` 的文件;禁止把业务菜单树、业务权限实现、DTO、表单字段、页面状态搬进 config。
- **stores 只存纯客户端状态**(token、外观、折叠);服务端数据一律归 TanStack Query,禁止在 store 里存服务端数据副本。
- 工程结构、页面目录、Route 边界的权威说明以 `docs/ARCHITECTURE.md` 为准;历史 plan/spec 的旧路径只作执行记录。

## 模块纵切(唯一形态)

- 业务按域**纵切**:`modules/<key>/<business>/`,内含 `index.tsx / api/ / mocks/ / model.ts / types.ts / list/ / detail/ / form/ / components/ / __tests__/`。
- **禁止横切**:不得新建 `modules/<key>/api`、`modules/<key>/pages` 这类跨业务的技术层目录(旧结构已废弃)。
- 无论业务简繁,**照同一骨架建,不裁剪、不发明第二种结构**;简单页对应目录留单文件或空即可。
- 归属决策树:单场景用 → 该场景目录(list/detail/form);本包 2+ 场景共享带 UI → `<business>/components/`;本包 2+ 场景共享纯逻辑 → `model.ts`;跨业务包共享 → `components/pro`(UI)/`lib`(逻辑)。
- `model.ts` 纯计算,**不 import React**;`types.ts` 只放 UI 状态类型(非 api 推导类型)。
- **禁止**在业务包内建按技术类型命名的 `utils/` / `helpers/` 抽屉目录。

## 数据流(数据下沉)

- 顶层 `index.tsx` 是 UI 骨架:**禁止** `useQuery` / `useSuspenseQuery` / `useMutation`,不持业务数据。
- 数据「谁消费谁请求」:Scene 及其子组件、detail 内层各自 `useQuery`。**禁止**顶层灌数据 prop drilling。
- 相同数据被多组件用 → 各自 `useQuery(同一 queryOptions)`,靠 key 去重复用缓存,不手传 data。
- 详情页**重新请求全量**(独立 `detailQuery(id)`),不复用列表行数据。

## 状态归属(最近公共父)

- UI 状态住在「所有消费它的组件的最近公共父」,不无脑上提 / 下沉。
- 表格分页 → `pro/DataTable` 内部;表格选择只经 `DataTable` 的受控 selection API,需要被批量条/筛选/分页清空等跨组件消费时住在最近公共父(如 `MembersScene`);表单草稿/校验 → 表单 hook;弹窗/详情/删除目标 → Scene(触发点与影响面的最近公共父,通常非顶层);当前 tab → index;筛选条件 → URL search。
- **禁止**把 `setState` 作为 prop 下传;父子只经 props(data + 语义回调)/ 回调通信。
- 详情状态存 **id 不存 dto**(数据交给 detail 内层自拉)。

## 缓存与 query key

- 每个业务包**必须**有 `api/keys.ts` factory;`queryKey` 只来自 factory,**禁止**内联字符串数组(如 `['iam','users']`)。key 逐字节一致是缓存复用前提。
- 跨组件数据同步只经 `invalidateQueries(xxxKeys.all)`,不经 props 传数据、不经状态上提。变更后按前缀失效。
- staleTime 分档:易变数据(列表/详情)默认 0(靠 invalidate + 聚焦保新鲜);准静态(部门/字典/权限点)设长 staleTime。就地写在 queryOptions。
- 写操作若影响关联数据(如部门成员数),额外失效对应 keys。
- 服务端数据归 TanStack Query;缓存模型(staleTime / gcTime / stale-while-revalidate)详见 `docs/ARCHITECTURE.md` 第 6 章。

## 类型与契约

- DTO 类型**只从** `api/schema.ts` 的 zod schema `z.infer`;**禁止**在别处手写重复 interface。
- 表单入参用 zod schema 定义并与表单校验共用(react-hook-form + `zodResolver`)。
- 所有 `http.*` **必须**传 zod contract;**禁止** `http.get<T>()` 泛型形式(编译期无法证明运行时 shape)。
- `tsconfig` strict + `noUncheckedIndexedAccess` 已开启;不得用 `as` 绕过类型、不得引入 `any`。

## UI 组件

- 通用、业务无关的表格/树/分页用 `components/pro`(DataTable / Tree / Pagination / TableShell …);业务层只组装、填数据、传回调。
- pro 组件业务无关:**禁止** import `@/modules/**`、**禁止** `useTranslation`(文案由外部 props 注入)。
- 业务页面**禁止**手写分页状态;行选择只能使用 `DataTable` 的 selection API,不得自建选择列/checkbox 状态机;**禁止**裸 `<input>`(用 `Input` / `SearchField` / `SelectControl`)。

## 显示比例纪律

- 显示比例统一用 `--app-scale` token 乘法,**不使用** CSS `zoom`。
- 业务页面优先用 Tailwind 默认 spacing/text/radius 与 `components/pro` 公共组件,基础层统一吃 `--app-scale`。
- 确需精确任意 px 时,必须写成 `calc(Npx * var(--app-scale))`,或沉到公共组件 / token 层。
- 新增图表、虚拟表格、富文本、代码编辑器、地图、Canvas、第三方弹层等重组件时,**必须验证 90% / 100% / 108% 三档**:尺寸随比例变化、portal 浮层定位正确、整页无溢出。
- Tailwind source 只扫描 `src`;不要让 `docs` / README / AGENTS 里的示例 class 进入生产 CSS。

## 样式与 token 纪律

- Tailwind 视觉类(颜色/圆角/阴影/hover/focus/active/selected/open)只允许出现在 `components/ui`、`components/pro`;业务层只写布局类(flex/grid/gap/间距)。
- **禁止**硬编码十六进制色值,优先语义 token。
- 组件状态样式必须走组件族 token:Field/Button/Overlay/Option/Menu/Tabs/Choice/Table/Pro/Shell 分别消费 `--field-*`、`--button-*`、`--overlay-*`、`--option-*`、`--menu-item-*`、`--tabs-*`、`--choice-*`、`--table-*`、`--pro-*`、`--nav-item-*` 等变量。
- 业务页面**禁止**用 `bg-pri-soft`、`text-pri`、`border-pri`、`ring-soft`、`hover:bg-surface-2` 这类 primitive class 表达通用 hover/focus/active/selected/open 状态。
- **禁止** `rounded-[Npx]` 任意圆角;圆角走 `--radius-*` token。
- 新增或改造基础 UI / Pro 组件时,**必须**同步更新 `/dev/theme-states` 状态矩阵和对应 guard;没有状态矩阵的 token 化不算完成。

## UI 视觉验收纪律

- UI 复刻类任务优先用 Agent Browser 截原型基线、实现侧截图和 diff 图,量化 `different pixels / total pixels`。
- 截图前必须断言页面、登录态、主题、布局、显示比例、关键文本正确,避免误截后拿错误基线比较。
- diff 百分比只作视觉层证据;必须结合 diff 图判断差异性质,不能为降低百分比而恢复假按钮或删真实功能。
- 视觉报告关键结论必须同步到任务文档;`test-results/` 只作可复查产物,不作唯一记录。

## i18n / 权限 / mock

- 文案走 i18n key;**禁止**新增中文硬编码进组件。路由 `staticData` 用 `labelKey / groupKey / action.labelKey`,不把用户可见中文散落在路由元数据里。
- 前端权限只负责体验与防误触,**不是安全边界**;生产权限必须由后端校验。
- mock 只在开发态、demo 或 `VITE_ENABLE_MOCK=true` 时启用;生产构建**必须**剥离 faker/msw/mock worker。mock 随业务纵切(`<business>/mocks/`),在 `src/mocks` 总聚合点挂载。
- 环境文件 `.env*` 不提交;开发默认已启用 mock,覆盖时只写本地 `.env.development`。

## 约定即测试(守卫哲学)

- 架构约束不靠自觉靠守卫。凡新增架构约束,**先加守卫测试再让实现变绿**(见 `src/app/__tests__/module-boundaries.test.ts`)。
- 改动任一业务包结构,须更新对应 `*-vertical-standard.test.ts` 守卫。

## 反过度工程

- 一个模式出现**不足 3 次**不抽象;重复优先于错误抽象。
- **禁止**为「简单页面」发明第二种目录结构。
- **禁止**提前种入未启用子系统 / 除已约定空目录外的投机结构。

## 每次「完成」前必跑

```bash
./node_modules/.bin/tsc -b --noEmit
./node_modules/.bin/eslint src
./node_modules/.bin/vitest run
pnpm theme:guard          # 涉及主题 / 基础组件 / Pro / 页面样式收敛时
pnpm design:lint          # 涉及 DESIGN.md / flavor 值表时
```

- 涉及生产构建:`tsc -b && vite build` 后 grep dist 断言无 `faker|msw|mockServiceWorker`。
- UI 复刻类:`pnpm visual` 采集三档比例,diff 结论同步到任务文档。

## 子系统增删清单

- **新增**:建 `modules/<key>/<business>/` 纵切包(含 api/mocks/list/detail/form);建 `routes/_auth/<key>/` 薄壳并写 `staticData`;`modules/registry.ts` 注册 manifest;`src/mocks` 总聚合挂 handlers;补 `locales/<key>/*.json`;新图标进 `icon-registry`;真后端再补 seed/menu/permission。
- **删除**:删纵切包、删路由壳、`registry` 除名、删 locales namespace、从 mock 聚合摘除。
- `admin` 是内核子系统;登录 / 消息中心 / 个人中心是 Shell 入口依赖,不当普通业务页随意删除。
