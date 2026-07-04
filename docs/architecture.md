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

- 新增、编辑、详情使用独立组件或显式变体，不用 `isCreate`、`isEdit`、`isDetail` 这种布尔组合堆复杂度。
- 多个子组件共享同一块复杂状态时，优先把状态提升到页面或专用 Provider，再通过清晰的 props/context 下发。
- 可复用组件优先接收 `children` 组合结构；只有列表渲染这类需要回传数据的场景才用 render prop。
- 组件内部函数按意图命名：`openCreateDialog`、`confirmDeleteRole`、`patchSearch`，不要把业务动作藏在匿名大函数里。

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
