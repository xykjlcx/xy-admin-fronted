# 前端工程架构约束

本文档是当前脚手架的现行工程约束。历史 plan/spec 中的旧路径仅代表当时执行记录；新增代码以本文档和当前代码为准。

## 分层职责

| 层级 | 路径 | 职责 | 禁止事项 |
| --- | --- | --- | --- |
| App | `src/app` | Provider、QueryClient、Shell、布局注册、全局装配 | 放业务页面实现 |
| Config | `src/config` | 环境变量校验、应用默认路由、存储 key、feature flags、request 默认策略、外观默认值 | 放运行时用户状态、业务菜单、业务 DTO、页面权限实现 |
| Routes | `src/routes` | URL 协议、`staticData`、`validateSearch`、可选 loader、route context 适配 | 写页面 UI、写 Query/Mutation hook、发 toast、直接依赖 module components |
| Module Pages | `src/modules/<key>/pages/<page>` | 页面入口、页面级状态、TanStack Query 编排、业务编排、tab/panel/dialog 组合 | 被跨模块复用、承载基础 UI 抽象 |
| Module API | `src/modules/<key>/api` | DTO、queryOptions、mutation API、query key | 持有 React UI 状态 |
| Module Mocks | `src/modules/<key>/mocks` | MSW handler、mock 数据规则 | 被生产代码直接依赖 |
| UI | `src/components/ui` | shadcn/ui 基础原语 | 写业务权限、业务文案、业务请求 |
| Pro | `src/components/pro` | 后台通用业务无关组件，如表格壳、状态徽标、过渡容器 | 绑定具体模块 DTO |
| Lib | `src/lib` | 纯函数、i18n、权限判断、图标注册、HTTP 基础设施 | 读写组件本地状态 |
| Stores | `src/stores` | token、外观、折叠态等纯客户端状态 | 存服务端数据副本 |

依赖方向只能从上往下：`routes -> modules/pages -> modules/api + components/pro + components/ui + lib`。`components/ui` 和 `components/pro` 不反向依赖模块页面。

## Config 边界

`src/config` 是脚手架启动策略和默认值中心，不是后台设置中心。

- `env.ts` 是唯一读取 `import.meta.env` 的源码文件；其他运行时代码必须通过 config 导出读取环境策略。
- `app.ts` 放应用默认路由、版本、locale、storage key 等框架级常量。
- `features.ts` 放 mock/demo/devtools 等 feature flags，避免开关散落在入口和页面中。
- `request.ts` 放 HTTP 默认策略和 envelope 字段约定，为接口契约层预留统一入口。
- `appearance.ts` 只放外观默认值；用户当前选择仍归 Zustand 和 localStorage。
- 禁止把业务菜单树、业务权限实现、DTO、表单字段、页面状态搬进 config。

## 页面目录

每个业务页面必须是文件夹：

```text
src/modules/admin/pages/users/
  index.tsx
  types.ts
  model.ts
  MembersPanel.tsx
  DeptSidebar.tsx
  CreateUserDialog.tsx
  EditUserDialog.tsx
  UserDetailSheet.tsx
```

约束：

- `index.tsx` 是页面唯一入口，负责页面级编排和本地 UI 状态分发。
- tab、panel、dialog、detail、create、edit 必须拆成明确子组件，不堆在一个大组件里。
- `types.ts` 放页面 props、表单状态、tab key 等类型。
- `model.ts` 放纯计算逻辑，不能 import React。
- 业务页面不再放入 `src/modules/<key>/components`；页面级实现统一归属 `src/modules/<key>/pages/<page>`。

## Route 边界

Route 文件只做边界装配：

- `staticData` 写权限、菜单 label key、breadcrumb group key 和 action key。
- `validateSearch` 管 URL search 的输入协议。
- loader 只做首屏体验优化和可选预取；不是所有页面必须有 loader。
- Route 不写 `useQuery`、`useMutation`、`useQueryClient`、toast 或 i18n 业务文案。
- 页面数据默认由 Module Page 入口或同目录 controller 读取，页面必须有自己的 loading/empty/success 状态。
- Route 必须从 `src/modules/<key>/pages/<page>` 导入页面入口。
- Shell 稳定性属于 App/Shell 层职责，业务页面不需要处理 Header、Sidebar 是否刷新。

## 状态模型

- 服务端数据归 TanStack Query。
- URL 可分享状态归 TanStack Router search。
- 表格筛选、当前 tab、打开的 dialog、选中的详情对象等短生命周期 UI 状态放页面组件。
- token、主题、布局、侧边栏折叠等纯客户端全局状态放 Zustand。
- 禁止把服务端列表复制进 Zustand 再维护一份副本。

## HTTP 契约

- `src/lib/http/client.ts` 负责统一请求、鉴权 header、timeout、abort、envelope 拆包、401 事件和错误归一。
- `src/lib/http/contract.ts` 是响应契约入口；后台接口必须通过 `defineApiContract({ response: Schema })` 声明运行时 response schema。
- 分页接口使用 `pageResultSchema(ItemSchema)`，不要每个模块手写 `{ list, total }` 校验。
- Module API 调用 `http.get/post/put/patch/del` 时必须传 response contract，禁止回到 `http.get<T>()` 这种只靠 TypeScript 的写法。
- request body schema 暂不强制；表单层和 DTO 先保持现状，等真实后端契约稳定后再决定是否纳入 OpenAPI/Zod 双向校验。

## 组件设计

- `src/components/ui` 是基础 UI 体系入口，承接设计体系里的 token、尺寸、状态、无障碍和控件 API。普通页面不要自己实现 Button/Input/Textarea/Select/RadioGroup/Tabs/Table/Dialog/Alert/Badge/Skeleton/Empty/Checkbox 这类原子控件。
- 基础 UI 组件以 shadcn/Radix 源码模式维护在本项目内；从 `@/components/ui/*` 引入的是项目本地组件，不是运行时从 shadcn 包导出。
- 新增基础 UI 原语默认先查官方 shadcn 组件：`pnpm dlx shadcn@latest docs <component>`、`pnpm dlx shadcn@latest add <component> --dry-run`、必要时 `--diff <file>`。没有明确理由，不从空白文件手写 Button/Input/Select/Table/Dialog 这类基础件。
- 已经本地定制过的基础组件不得直接 `--overwrite`；先看 shadcn diff，再把上游无障碍、组合结构和依赖更新合并到本地 token/variant 体系里。
- 样式定制优先级：全局 token / `@theme inline` → shadcn 组件 variant → `components/pro` 组合层 → 页面 className。页面层只允许布局微调，不承担基础控件视觉定义。
- Button 标准变体使用 `primary`、`secondary`、`dashed`、`text`、`danger`、`danger-ghost`；`default`、`outline`、`ghost`、`link`、`destructive` 只作为兼容旧调用的别名逐步迁移。
- Input 标准形态优先用 `Input`；有前缀、后缀、拼接前缀时用 `InputGroup`、`InputGroupInput`、`InputGroupPrefix`、`InputGroupSuffix`、`InputGroupAddon` 组合，错误态通过 `status="error"` 或 `aria-invalid` 表达。
- 业务表单下拉统一使用 `SelectControl` / Radix Select，自定义弹层、选项态、尺寸和动画必须吃项目 token；`NativeSelect` 只保留给明确需要系统原生选择器的极少数场景，不作为后台表单默认控件。
- Textarea、RadioGroup、Tabs、Table、Separator、Alert、Form、Label 已进入基础 UI 基线；复杂业务表单优先用 `Form` + `Field` / `FormField` 组合，不在页面临时拼 label、错误文案和控件关联。
- Badge、Skeleton、Empty、Checkbox 属于基础展示/反馈原子件；`StatusBadge`、`SearchField`、`TableShell` 这类后台通用组合必须复用它们。
- `src/components/pro` 只沉淀业务无关的后台模式组件，例如表格壳、分页、筛选、侧边列表、表单弹窗。Pro 组件可以组合 UI 组件，但不能引入模块 DTO、接口或权限逻辑。
- 页面层只描述业务含义和编排，不直接写原生 `<button>`、`<input>`、`<select>`、`<textarea>`，除非该控件被封装为新的 UI/Pro 组件时作为实现细节出现。
- 组件样式只消费语义 token、Tailwind 语义类和 `--app-scale` 尺寸体系；页面不得新增硬编码色值、任意圆角或脱离 token 的控件尺寸。
- 动画属于组件契约：tabs 指示条、展开收起、加载骨架、按钮 pending、进度条等动效优先沉到 UI/Pro 组件，并提供 `motion-reduce` 降级；页面不直接写临时动画。
- 新增、编辑、详情使用独立组件或显式变体，不用 `isCreate`、`isEdit`、`isDetail` 这种布尔组合堆复杂度。
- 多个子组件共享同一块复杂状态时，优先把状态提升到页面或专用 Provider，再通过清晰的 props/context 下发。
- 可复用组件优先接收 `children` 组合结构；只有列表渲染这类需要回传数据的场景才用 render prop。
- 组件内部函数按意图命名：`openCreateDialog`、`confirmDeleteRole`、`patchSearch`，不要把业务动作藏在匿名大函数里。

## 主题 Token 纪律

当前主题体系分五层：

```text
Primitive / Semantic
  -> UI Component State Tokens
  -> Pro Component Tokens
  -> Shell / Page Composition Tokens
  -> Module Page Layout
```

约束：

- `src/styles/tokens.css` 是 token 定义唯一入口；组件只消费 token，不判断 `flavor`。
- UI 组件族使用组件状态 token，例如 `--field-*`、`--button-*`、`--option-*`、`--overlay-*`、`--tabs-*`、`--choice-*`、`--table-*`。
- Pro/Shell 组件使用组合 token，例如 `--pro-*`、`--side-list-*`、`--nav-item-*`、`--pagination-*`。
- 组件 token 不进入 `@theme inline`，统一用 Tailwind v4 括号变量语法：`bg-(--token)`、`border-(--token)`、`text-(--token)`。
- 状态优先级靠 `src/styles/global.css` 的状态机声明顺序，不依赖 Tailwind 变体生成顺序。
- 业务页面不得用 `bg-pri-soft`、`text-pri`、`border-pri`、`ring-soft`、`hover:bg-surface-2` 等 primitive class 表达控件状态；已经完成 token 化的样板页会被 guard 拦住。
- 页面层允许写布局和业务专属展示，但通用 hover/focus/active/selected/expanded/open 状态必须沉到 UI 或 Pro 组件。

新增组件族流程：

1. 先判断它属于 UI 原语、Pro 组件还是页面专属组合。
2. UI 原语先查 shadcn 官方实现和 Radix 合同，保留 Portal、focus、keyboard、aria、outside click 等交互结构。
3. 在 `docs/design/*.design.md` 或 spec 实测记录里确认值来源；新增 flavor 必须先补 DESIGN.md，再回写值表。
4. 在 `tokens.css` 定义该族默认 token 和必要的 flavor/mode 覆盖，不提前批量创建未消费 token。
5. 组件只消费该族 token；不要把 primitive 状态 class 写进组件或页面。
6. 在 `/dev/theme-states` 补状态矩阵，至少覆盖默认、hover/focus 或 open、selected/active、disabled/invalid 等该族关键状态。
7. 补 `tokens.snapshot.test.ts` 和 `theme-guards.test.ts`；完成 token 化的文件加入强约束清单。
8. 跑 `pnpm theme:guard`、`pnpm design:lint`、`tsc`、`vitest`、`eslint`，必要时用 Agent Browser 截三 flavor × light/dark 状态图。

## 纵向样板线

`users` 是当前脚手架的第一条纵向样板线。它不是只证明页面能用，而是证明“普通后台页面应该如何组合基础组件”。

约束：

- `src/modules/admin/pages/users` 页面层禁止直接写原生 `<button>`、`<input>`、`<select>`、`<textarea>`；交互控件必须从 `components/ui` 或 `components/pro` 组合。
- `src/modules/admin/pages/users` 页面层禁止写 `style={{ ... }}`；树形缩进、页面 padding、表格 grid 等视觉策略下沉到基础组件或 Pro 组件。
- 页面入口只保留业务状态编排、权限判断、query/mutation 调度和事件分发。
- 搜索框、筛选下拉、分页、侧边列表、详情字段、表单弹窗等普通后台能力先沉到 `components/pro`，再由 roles/menus 等页面反向验证是否值得继续推广。
- 基础 UI 组件优先承接控件级视觉和可访问性；业务页面只通过 props 表达业务含义。

## 新增页面清单

1. 在 `src/modules/<key>/pages/<page>/index.tsx` 建页面入口。
2. tab/panel/dialog/detail/create/edit 拆成同目录子组件。
3. 在 `src/routes/_auth/<key>/<page>.tsx` 只写 route 协议、可选 loader、URL/context 适配，并从 pages 入口导入页面。
4. 补 `staticData` 的 i18n key、权限 code、action key。
5. 服务端数据走 `api/*.api.ts` 的 queryOptions/mutation API，并在 Module Page 层组合。
6. 本地 loading/empty/error 状态在内容区内处理，不能让 Shell 跟随业务数据刷新。
7. 补页面测试和必要的 route/shell 稳定性测试。
8. 跑 `tsc`、`vitest`、`eslint`。

## 守护测试

`src/app/__tests__/module-boundaries.test.ts` 会自动扫描 admin route，阻止 route 直接引用 `modules/admin/components`，要求每个 admin route 都有 `modules/admin/pages/<page>/index.tsx`，阻止 Query/Mutation/toast/i18n 业务逻辑回流到 route，并阻止旧的 `modules/admin/components` 目录回流。

主题相关门禁：

- `pnpm theme:guard`：单独运行 token 快照、悬空 CSS 变量引用、违规 class baseline、状态页矩阵和模块边界测试。
- `pnpm design:lint`：运行 `@google/design.md`，校验三套 flavor 的 DESIGN.md。已知 warning 必须能追溯到 spec 白名单；新增 warning 不能静默放过。
- CI 已显式运行 `theme:guard` 和 `design:lint`。后续新增 token、组件族或 flavor 时，不允许只靠全量 `vitest` 顺带覆盖。
- `/dev/theme-states` 是主题验收入口。每个完成 token 化的组件族都必须在这里有可截图状态矩阵，否则视为没有验收面。

主题验收 checklist：

1. 三个 flavor 与 light/dark 都能在 `/dev/theme-states` 切换。
2. Field、Button、Overlay、Option/Menu、Tabs/Choice、Table/Pro/Shell 都能看到机制级差异，不只是主色变化。
3. shadcn dark 下主按钮文字可读，自定义亮色 accent 的前景色自动可读。
4. Radix 浮层不破坏 Portal、outside click、autoFocus、Escape 和 `--radix-*` 定位变量。
5. 新增页面只组合 UI/Pro 组件，不复制控件状态样式。
