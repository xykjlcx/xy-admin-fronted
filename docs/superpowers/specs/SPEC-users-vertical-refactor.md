# SPEC: Users 板块纵切改造（成员与部门）

> 执行者：Claude Code / Codex
> 范围：`src/modules/admin`、`src/routes/_auth/admin`、`src/components/pro`、`src/mocks`
> 目标：把「成员与部门」页从「横切 + 顶层灌数据」重构为「业务纵切 + 数据下沉 + 组件自足」。
> 本 spec 是**施工图**，不是讨论稿。每一步都给出目标文件、职责、约束与验收命令。按 §9 的顺序执行，每步跑一次 §10 的验收门禁再进入下一步。

---

## 0. 执行者须知（先读，不可跳过）

1. **这是重构，不是重写。** 现有 `user.api.ts`、`MembersPanel.tsx`、`UserFormDialog.tsx` 的业务逻辑必须原样保留语义，只改变**组织结构与状态归属**。禁止顺手改动 UI 视觉、token、文案 key、mock 数据形状。
2. **依赖顺序不可颠倒。** 先补基础层（pro/DataTable、pro/Tree），再抽状态与拆场景。跳步会导致中间态编译不过。
3. **每一步结束必须通过门禁**（§10）。任何一步门禁红，停止，修复，不要继续叠加改动。
4. **不确定时不要自由发挥。** 本 spec 未明确的结构，沿用现有代码既有写法；确有歧义则在该步产出一个 `// SPEC-QUESTION:` 注释并继续，不擅自扩大改动面。
5. **不引入新依赖。** react-hook-form / zod / @tanstack/* 均须先在 Step 0 校验已存在于 package.json，直接用；确认缺失则记 `SPEC-QUESTION` 并停止，不得自行 `npm install`。
6. **每步一个 commit，出错即停不回滚。** 每完成一步先提交（message 用 `refactor(users): step N - <内容>`）。若某步门禁红且无法快速定位修复，**停下并报告**，不得：擅自回滚已提交的前序步骤、跨步骤大范围改动、或为让门禁变绿而删功能/删测试。前序 commit 是安全回退点，只有维护者可决定回滚。
7. **INV-1 澄清（避免误解）**：INV-1 禁止的是**数据获取 hook**（`useQuery`/`useSuspenseQuery`/`useMutation`），**不禁止**纯 UI 状态的 `useState`（如 `index.tsx` 里的当前 tab）。守卫测试只匹配数据 hook，不匹配 `useState`。

---

## 0.5 Step 0：基线固化 + 环境校验（改造前必做，不可跳过）

> 不写业务代码，但它是「行为等价」可验证的前提。没有基线，后续所有「与改造前一致」的验收都是空话。

### 0.5.1 环境与脚本校验
先确认门禁命令真实存在，避免执行到一半卡在不存在的 script：

```bash
cat package.json | grep -A30 '"scripts"'    # 核对 scripts 实际名称
node -v && cat package.json | grep -E '"(react-hook-form|zod|@tanstack/react-query|@tanstack/react-router|msw|@faker-js/faker)"'
```
- 逐一核对 §10 用到的 `theme:guard` / `design:lint` / `visual` / `test`(vitest) 等 script 名是否与本 spec 一致；**不一致以 package.json 为准**，在报告中列出实际命令。
- 确认 react-hook-form / zod / @tanstack/* 已在依赖中。缺任一则记 `SPEC-QUESTION` 并停止。

### 0.5.2 交互行为基线（改造后逐条比对的锚点）
改造前跑通现有成员与部门页，记录《users 行为基线》到 `docs/baselines/users-behavior-baseline.md`，逐条列出当前表现：

- 三个 tab（成员 / 部门 / 已离职）各自的默认加载、空态、加载态。
- 部门树：选中部门 → 右侧成员表如何过滤；根/子节点行为。
- 成员表：分页、行选择（单选/全选本页/半选/翻页清空）、批量停用触发条件与结果。
- 新建 / 编辑 / 删除 / 查看详情：入口、弹窗字段、提交后列表如何刷新。
- 筛选：状态筛选、directOnly、关键词搜索分别改变什么。
- 每条附「当前 queryKey / 请求路径」（从现有代码提取），作为数据流比对依据。

### 0.5.3 视觉基线
```bash
pnpm visual    # 或 package.json 中对应 script；采集成员/部门/离职页 90%/100%/108% 三档基线截图
```
归档到 `test-results/baseline-users/`。若 `visual` 不存在，用 AGENTS「UI 视觉验收纪律」的 Agent Browser 流程采集并注明。

**Step 0 完成定义**：环境校验通过、《行为基线》已写、三档视觉基线已归档。三者齐备才可进入 Step 1。

---

## 1. 目标目录结构（改造完成后的终态）

```text
src/modules/admin/users/                 ← 从 pages/users 上移一级，成为业务纵切包
├── index.tsx                            ← UI 骨架：Card + Tabs，分发三个 Scene（不拉数据、不持业务状态）
├── api/
│   ├── schema.ts                        ← 唯一类型源：zod schema + z.infer 出的 DTO
│   ├── keys.ts                          ← query key factory（userKeys / deptKeys）
│   ├── user.ts                          ← user 资源：queryOptions + mutation hooks
│   ├── dept.ts                          ← dept 资源：queryOptions
│   └── index.ts                         ← 汇总导出
├── mocks/
│   ├── db.ts                            ← 该业务的 seed / faker 数据
│   ├── user.handlers.ts
│   ├── dept.handlers.ts
│   └── index.ts                         ← 汇总 handlers
├── model.ts                             ← 纯派生逻辑（statusTone / buildDepthMap / initials）
├── types.ts                             ← UI 状态类型（TabKey / UserFormState 等，非 api 推导类型）
├── list/
│   ├── MembersScene.tsx                 ← 成员场景编排：左 DeptTree + 右区
│   ├── DeptTree.tsx                     ← 部门树（薄壳：调 pro/Tree，自己拉 deptsQuery）
│   ├── MembersTable.tsx                 ← 成员表（薄壳：调 pro/DataTable，自己拉 usersQuery）
│   ├── UsersToolbar.tsx                 ← 筛选条 + 新建按钮 + 批量操作触发
│   ├── DeptScene.tsx                    ← 部门场景：无左树，直接部门表
│   └── columns.tsx                      ← 成员列定义（纯配置）
├── detail/
│   ├── UserDetailPage.tsx               ← 详情容器：Sheet + Tabs；内层独立 useQuery(userDetailQuery)
│   ├── ProfileTab.tsx
│   └── PermissionTab.tsx
├── form/
│   ├── UserFormDialog.tsx               ← create/edit 合一
│   └── useUserForm.ts                   ← react-hook-form + zodResolver，复用 api/schema
├── components/                          ← 仅本包内 2+ 场景共享的 UI 碎片（如 UserAvatar）
└── __tests__/
```

**同时删除**：`src/modules/admin/pages/users/`（整目录，内容已迁移）。
**路由壳保持在** `src/routes/_auth/admin/users.tsx`（A 方案：routes 与 modules 分离），仅改 import 路径。

> 注意：本 spec 只改造 `users`。`roles`/`menus`/`dashboard` **保持现状不动**，留待后续按同一模板迁移。因此本次 `pages/` 目录不整体删除，只删 `pages/users/`。

### 1.1 `types.ts` 类型范式（照此定义，不自由发挥）

UI 状态类型（**非** api 推导类型）集中在 `types.ts`。以下为必须存在的类型，按此形状写：

```ts
import type { UsersQueryParams } from './api';

export type TabKey = 'members' | 'depts' | 'left';

/** URL search 协议 = 查询参数 + 关键词。与路由 validateSearch 对齐 */
export type UsersSearch = UsersQueryParams & { keyword: string };

/** 表单弹窗状态：discriminated union，form 组件按 kind 分支渲染 */
export type UserFormState =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit'; user: UserDto };   // UserDto 从 api 引入，勿在此重复定义

/** 成员场景变体 */
export type MembersVariant = 'members' | 'left';
```

约束：`types.ts` 只放上述 UI 状态类型；任何能从 `api/schema.ts` 推导的 DTO（UserDto/DeptDto/…）**禁止**在此重复声明，一律从 `@/modules/admin/users/api` 引入（INV-5）。

---

## 2. 架构不变量（改造全程必须始终成立）

以下每条都有对应的守卫测试（§8），改造后必须为绿：

- **INV-1 数据下沉**：`index.tsx` 不得出现 `useQuery` / `useSuspenseQuery` / `useMutation`。数据请求只发生在 Scene 及其子组件、detail 内层。
- **INV-2 状态就近**：UI 状态住在「所有消费它的组件的最近公共父」。表单/详情/删除确认状态住在 `MembersScene`，不上提到 `index.tsx`；表格分页状态住在 `pro/DataTable` 内部；表格选择只经 `DataTable` 的受控 selection API，在批量条/筛选/分页清空等跨组件消费时住在 `MembersScene`，禁止旧的清空选择 key 机制或业务层自建 checkbox 状态机。
- **INV-3 单向数据流**：父传子只经 props（data + 语义回调），子传父只经回调；禁止把 `setState` 作为 prop 下传。
- **INV-4 key 唯一源**：所有 `queryKey` 只能来自 `api/keys.ts` 的 factory，禁止内联字符串数组（如 `['iam','users']`）。
- **INV-5 类型唯一源**：DTO 类型只从 `api/schema.ts` 的 zod schema `z.infer` 得到，禁止在别处手写重复 interface。
- **INV-6 路由薄壳**：`routes/_auth/admin/users.tsx` 不得含 `useQuery`/`useMutation`/`useQueryClient`/`useSuspenseQuery`/`from 'sonner'`/`useTranslation`（沿用现有 module-boundaries 守卫）。
- **INV-7 契约校验**：所有 `http.*` 调用必须传 zod contract，禁止 `http.get<T>()` 泛型形式。

---

## 3. 基础层改造（Step 1–2，先做，解锁项）

### 3.1 `src/components/pro/DataTable.tsx`（新建，业务无关通用表格）

**职责**：吃下所有「与具体业务无关」的表格机制——TanStack 核心行模型、选择列渲染、当前页选中聚合、分页、loading 骨架、空态。选择状态本身按 `DataTable` 受控 selection API 由最近公共父持有；业务层只传 `columns + data + selection + 回调`，不得自建选择列或 checkbox 状态机。

**内部实现要求**：
- 基于 `@tanstack/react-table`、本地 `ui/table`、本地 `ui/checkbox` 与现有 `Pagination` 组合；不引入排序、过滤、虚拟化等白名单外能力。
- 分页复用现有 `Pagination` 组件。
- 行选择逻辑：只使用 TanStack 白名单能力（`getCoreRowModel` + 行选择 API）。选择列由 `DataTable` 作为普通 `ColumnDef` 插入；全选只作用当前页（`getIsAllPageRowsSelected` / `toggleAllPageRowsSelected`），翻页或筛选变化由业务最近公共父清空受控 `rowSelection`。

**对外 API（严格按此签名）**：

```ts
import type { ReactNode } from 'react';
import type { ColumnDef, OnChangeFn, RowSelectionState } from '@tanstack/react-table';

export interface DataTableSelection {
  enabled: boolean;
  rowSelection: RowSelectionState;
  onRowSelectionChange: OnChangeFn<RowSelectionState>;
  /** 批量操作条渲染：传入当前页选中 id，返回操作区 ReactNode；无选中时不渲染 */
  renderBulkBar?: (selectedVisibleIds: string[]) => ReactNode;
  selectAllAriaLabel?: string;
  rowSelectAriaLabel?: string;
}

export interface DataTablePagination {
  page: number;
  pageCount: number;
  total: number;
  refreshing?: boolean;
  totalLabel: string;
  refreshingLabel?: string;
  prevLabel: string;
  nextLabel: string;
  currentLabel: string;
  onPageChange: (page: number) => void;
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  selection?: DataTableSelection;
  pagination?: DataTablePagination;
  onRowClick?: (row: T) => void;
  emptyText: string;
  loadingText: string;
  rowState?: (row: T) => 'selected' | undefined; // 透传给 TableRow 的 data-state
}

export function DataTable<T>(props: DataTableProps<T>): JSX.Element;
```

**约束**：
- 组件本体禁止出现任何硬编码色值 / `rounded-[Npx]` / `shadow-[...]`（沿用现有 lint 规则）。
- 禁止 import 任何 `@/modules/**`（业务无关）。
- 所有文案由外部以 prop 传入（`emptyText`/`loadingText`/`aria-label`），组件内不 `useTranslation`。

### 3.2 `src/components/pro/Tree.tsx`（新建，业务无关树）

**职责**：受控树，渲染层级 + 选中态，业务无关。

```ts
export interface TreeNode {
  id: string;
  label: ReactNode;
  depth: number;         // 由业务侧算好（复用 buildDepthMap），Tree 只按 depth 缩进
  meta?: ReactNode;      // 右侧附加信息，如成员数
}

export interface TreeProps {
  nodes: TreeNode[];
  selectedId?: string;
  onSelect: (id: string) => void;
  ariaLabel: string;
}
export function Tree(props: TreeProps): JSX.Element;
```

**约束**：缩进用 `calc(depth * Npx * var(--app-scale))`（参考现有 `TableTreeCell`）。业务无关，不 import modules，不 `useTranslation`。

### 3.3 状态矩阵同步（强制）

新增 `DataTable` 与 `Tree` 后，**必须**在 `src/routes/_auth/dev/theme-states.tsx` 补对应状态样例（空态/加载/选中/分页/树选中），并更新 `module-boundaries.test.ts` 中 theme-states 相关断言。**没有状态矩阵的基础组件视为未完成**（沿用现有 AGENTS 铁律）。

---

## 4. API 层改造（Step 3）

将现有 `src/modules/admin/api/user.api.ts` 拆入 `src/modules/admin/users/api/`。

### 4.1 `api/schema.ts`（唯一类型源）

- 迁入现有 `UserStatusSchema` / `DeptSchema` / `UserSchema`，`pageResultSchema(UserSchema)`。
- **新增**：把当前手写的 `CreateUserInput` / `UpdateUserInput` 改为 zod schema，再 `z.infer`：

```ts
export const CreateUserSchema = z.object({
  name: z.string().min(1),
  deptId: z.string().min(1),
  role: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email(),
});
export type CreateUserInput = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = CreateUserSchema.partial().extend({
  status: UserStatusSchema.optional(),
});
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
```

> 目的：表单校验（§7 useUserForm）与接口入参共用同一 schema，前后端字段对齐只有一处真相（INV-5）。

- **新增详情 schema**：`UserDetailSchema`（在 `UserSchema` 基础上扩展详情独有字段，如 `createdAt`/`lastLoginAt`/`bio` 等；若后端字段未知，先 `UserSchema.extend({})` 占位并加 `// SPEC-QUESTION: 详情扩展字段待后端确认`）。

### 4.2 `api/keys.ts`（key factory，INV-4）

```ts
import type { UsersQueryParams } from './schema';

export const userKeys = {
  all: ['iam', 'users'] as const,
  list: (p: UsersQueryParams) => [...userKeys.all, 'list', p] as const,
  detail: (id: string) => [...userKeys.all, 'detail', id] as const,
};

export const deptKeys = {
  all: ['iam', 'depts'] as const,
};
```

> 现有代码中所有内联 `['iam','users']` / `['iam','depts']`（含 `invalidateQueries`、`queryKey`）全部替换为 factory 调用。

### 4.3 `api/user.ts` 与 `api/dept.ts`

- `usersQuery(params)` / `deptsQuery` 迁入，`queryKey` 改用 factory。
- **新增** `userDetailQuery(id)`：`queryKey: userKeys.detail(id)`，`queryFn: () => http.get(\`/api/users/${id}\`, undefined, userDetailContract)`。
- **staleTime 分档**（写进 queryOptions）：
  - `usersQuery`：不设 staleTime（默认 0，靠 invalidate + 聚焦保新鲜）。保留 `placeholderData: keepPreviousData`。
  - `deptsQuery`：`staleTime: 5 * 60 * 1000`（部门准静态）。
  - `userDetailQuery`：不设 staleTime（默认 0，进详情即取最新）。
- **mutation 收敛为 hook**，放 `api/user.ts`，把缓存失效绑定在此（不再散落在页面）：

```ts
export function useUserMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: userKeys.all });
  const createUser = useMutation({ mutationFn: userApi.createUser, onSuccess: invalidate });
  const updateUser = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateUserInput }) => userApi.updateUser(id, dto),
    onSuccess: invalidate,
  });
  const deleteUser = useMutation({ mutationFn: userApi.deleteUser, onSuccess: invalidate });
  const batchDisable = useMutation({ mutationFn: userApi.batchDisableUsers, onSuccess: invalidate });
  return { createUser, updateUser, deleteUser, batchDisable };
}
```

### 4.4 `api/index.ts`

汇总导出 schema 类型、keys、queryOptions、`userApi`、`useUserMutations`。**外部只从 `@/modules/admin/users/api` 引入**，不深引 `api/user.ts` 等内部文件。

---

## 5. Mock 层改造（Step 3 同批）

- 新建 `users/mocks/`，把现有 `src/modules/admin/mocks/user.handlers.ts` 与 dept 相关 handler 迁入，拆为 `user.handlers.ts` / `dept.handlers.ts`，seed 数据入 `db.ts`。
- **新增** `GET /api/users/:id` handler（返回 `UserDetailSchema` 形状），供 `userDetailQuery` 使用。
- `mocks/index.ts` 汇总导出 `usersModuleHandlers`。
- 修改 `src/mocks/handlers.ts` 聚合点：将 `import { userHandlers } from '@/modules/admin/mocks/user.handlers'` 改为从 `@/modules/admin/users/mocks` 引入，其余模块（role/menu/dashboard/auth）**保持不变**。

---

## 6. 页面层改造：index + Scene（Step 4–5）

### 6.1 `index.tsx`（UI 骨架，INV-1）

- 只保留 `UsersPage`，删除现有 `UsersView`（其职责拆入 Scene）。
- `UsersPage` 职责：从路由拿 `permissions` / `search` / `onSearchChange`；渲染 `PageFrame > Card > Tabs`；按 tab 挂载 `MembersScene` / `DeptScene` / `MembersScene(variant='left')`。
- **禁止**在此出现任何 query/mutation/业务状态。tab 当前值可由 `search.status` 派生 + 一个本地 `useState`（tab 属于「三个 tab 面板的最近公共父」状态，允许住这里）。

签名：

```ts
interface UsersPageProps {
  permissions: string[];
  search: UsersSearch;                                   // = UsersQueryParams & { keyword: string }
  onSearchChange: (patch: Partial<UsersQueryParams>) => void;
}
export function UsersPage(props: UsersPageProps): JSX.Element;
```

### 6.2 `list/MembersScene.tsx`（成员场景，状态归属层，INV-2/INV-3）

**这是本次改造的重心。** 成员相关的所有作用域状态住在这里。

**完整 props 契约（照此签名，勿自创）**：

```ts
interface MembersSceneProps {
  variant: MembersVariant;                                  // 'members' | 'left'
  permissions: string[];
  search: UsersSearch;                                      // 从 index 透传（含 status/keyword/page/deptId）
  onSearchChange: (patch: Partial<UsersQueryParams>) => void; // 改 URL search（筛选/翻页/选部门）
}
export function MembersScene(props: MembersSceneProps): JSX.Element;
```

**内部持有的状态**（住在此层，不上提 index、不下沉子组件）：
- `formState: UserFormState`（来自 types.ts，closed/create/edit）
- `detailUserId: string | null`（存 id 不存 dto）
- `deleteTarget: UserDto | null`
- `const mutations = useUserMutations()` —— mutation 在此，不在顶层。
- 当前部门 `deptId` **不新增本地 state**：直接读 `search.deptId`，切换经 `onSearchChange({ deptId })`（deptId 属可分享状态，归 URL）。

**组合**：左 `DeptTree` + 右（`UsersToolbar` + `MembersTable`），下方挂 `UserFormDialog` / `UserDetailPage` / `ConfirmDialog`。

**variant 差异（精确到 prop）**：
- `variant='members'`：正常渲染，写操作按钮（新建/编辑/删除/批量停用）按 permissions 显示。
- `variant='left'`：传给 `MembersTable` 的 `status` 锁为 `'left'`；`UsersToolbar` 的 `onCreate` 传 `undefined`（隐藏新建）；`columns` 的 `onEdit/onDelete` 传 `undefined`（列内操作按钮相应隐藏）。**通过传 undefined 回调关闭能力，而非渲染两套组件**。

**数据流规则**：
- `MembersTable` 经回调 `onView(user)` / `onEdit(user)` / `onCreate()` / `onDelete(user)` 上报，`MembersScene` 据此 setState 开弹窗。**禁止把 `setDetailUserId` 等 setState 直接下传**（INV-3）。
- 删除确认 `onConfirm` 调 `mutations.deleteUser.mutateAsync(deleteTarget.id)`，成功后 `useUserMutations` 内部已 invalidate，无需手动刷新。
- 表单提交经 `mutations.createUser` / `mutations.updateUser`；提交成功后 `setFormState({ kind: 'closed' })`。

### 6.3 `list/MembersTable.tsx`（自足表格，数据下沉，INV-1）

- 自己 `useQuery(usersQuery(effectiveSearch))`，`effectiveSearch` 由 props（deptId/status/page/keyword）拼装。
- 渲染 `pro/DataTable`，`columns` 来自 `columns.tsx`，选择/分页交给 DataTable 内部。
- 通过 props 接收 `permissions` 与各回调；`useTranslation` 在此获取表格文案并注入 DataTable（DataTable 本身不 i18n）。

### 6.4 `list/DeptTree.tsx`（自足树，数据下沉）

- 自己 `useQuery(deptsQuery)`；用 `buildDepthMap` 算 depth，转 `TreeNode[]`（meta 放成员数）传入 `pro/Tree`。
- 受控选中：`selectedId` / `onSelect` 由 `MembersScene` 传入。

### 6.5 `list/UsersToolbar.tsx`

- 状态筛选（`FilterSelect`）、directOnly 切换、新建按钮。纯展示 + 回调，无数据请求。

### 6.6 `list/DeptScene.tsx`

- 部门场景：无左树，自己 `useQuery(deptsQuery)`，用 `pro/DataTable` 渲染部门表（层级用缩进列表达）。

### 6.7 `list/columns.tsx`

- 导出 `userColumns(ctx: { t; permissions; deptById; onView?; onEdit?; onDelete? }): ColumnDef<UserDto>[]`（`onEdit/onDelete` 可选，`variant='left'` 时不传即隐藏对应操作，见 §6.2）。
- 把现有 `MembersPanel` 中行内渲染（头像、StatusBadge、操作按钮）迁为列的 `cell` 渲染函数。**视觉输出必须与现状一致**。

### 6.8 i18n key 处理（拆分过程中不新造、不丢失文案）

MembersPanel 被拆成 Scene/Table/Toolbar/columns 多文件后，原本集中的文案会分散。规则：

- **复用现有 key，不新造。** 原 users 页用的 i18n key（命名空间、key 名）**原样保留**，只是引用它们的组件位置变了。禁止借拆分之机重命名 key 或改命名空间。
- **文案获取位置**：`useTranslation('admin')` 在**业务组件**（MembersScene / MembersTable / UsersToolbar）内调用；`columns.tsx` 通过 `ctx.t` 接收 `t` 函数，不自己 `useTranslation`（保持 columns 为纯配置）。`pro/DataTable`、`pro/Tree` **不 i18n**，文案由业务层以 prop 注入。
- **确需新增 key**（如详情 Tab、新空态文案）：加到现有 `locales/admin/*.json` 对应命名空间，`zh-CN` 与 `en-US` 同步补全，避免 `design:lint` / i18n 缺失告警。新增 key 在报告中列出。

---

## 7. 详情与表单（Step 6–7）

### 7.1 `detail/UserDetailPage.tsx`（重新请求，你已定）

```tsx
export function UserDetailPage({ userId, onClose }: { userId: string | null; onClose: () => void }) {
  return (
    <Sheet open={!!userId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent>
        {userId && <UserDetailInner userId={userId} />}
      </SheetContent>
    </Sheet>
  );
}

function UserDetailInner({ userId }: { userId: string }) {
  const { data, isPending } = useQuery(userDetailQuery(userId)); // 独立请求全量详情
  if (isPending) return <DetailSkeleton />;
  return (
    <Tabs defaultValue="profile">
      {/* ProfileTab / PermissionTab */}
    </Tabs>
  );
}
```

- 外层守空、内层 `userId: string` 非空——内层 query 不需 `enabled` 判断，类型干净。
- `ProfileTab` 复用 `DescriptionList`（迁移现有 `UserDetailSheet` 的字段展示逻辑作为 ProfileTab 内容）。
- `PermissionTab` 可先占位（渲染空态 + `// SPEC-QUESTION: 权限 tab 数据源待定`）。

### 7.2 `form/UserFormDialog.tsx` + `form/useUserForm.ts`

- 保持 create/edit 合一（现状已合并，迁移即可）。
- 表单状态从手写 `useState<CreateUserInput>` 升级为 `useUserForm`：`react-hook-form` + `zodResolver(CreateUserSchema)`。
- 校验替换：删除现有 `submitDisabled={!draft.name || ...}` 手写判断，改由 RHF `formState.isValid` 驱动。
- 字段仍用现有 `Field`/`FieldLabel`/`Input`/`SelectControl`，通过 RHF `register`/`Controller` 接入。

---

## 8. 守卫测试（必须新增/更新，随代码一起提交）

### 8.1 ⚠️ 先迁移现有守卫（否则改造后旧测试必然变红）

现有 `src/app/__tests__/module-boundaries.test.ts` 断言的是**旧横切结构**。改造后这些断言会失败——这是**预期的**，agent 必须按下表处置，不要误以为是自己改错、也不要为了让测试变绿而回退结构：

| 现有断言 | 处置 | 说明 |
| --- | --- | --- |
| 要求每个 admin route 有 `modules/admin/pages/<page>/index.tsx` | **改路径**：users 改为要求 `modules/admin/users/index.tsx`；其余未迁移页（roles/menus/dashboard）仍指向旧 `pages/<page>` | 混合期两种断言并存，随各页迁移逐步切换 |
| 阻止 route 直接引用 `modules/admin/components` | **保留** | 规则仍有效 |
| 阻止旧 `modules/admin/components` 目录回流 | **保留** | 规则仍有效 |
| "admin routes stay thin"（route 不含 Query/Mutation/toast/i18n） | **保留并扩展**：确保覆盖 `routes/_auth/admin/users.tsx` 新写法 | INV-6 |
| "api modules use runtime response contracts" | **改路径 + 保留**：扩展到 `modules/admin/users/api/**` | INV-7 |
| theme-states 相关断言 | **扩展**：纳入新增的 DataTable / Tree 状态样例 | §3.3 |

处置原则：**旧规则语义仍成立的 → 改路径保留；只适配旧结构的 → 就地改成适配 users 纵切结构**。不删除任何仍有效的边界约束。

### 8.2 新增守卫（新建 `users-vertical-standard.test.ts`）

1. **INV-1**：读 `users/index.tsx` 源码，断言不含 `useQuery(` / `useSuspenseQuery` / `useMutation`（**允许** `useState`）。
2. **INV-4**：递归读 `users/**/*.{ts,tsx}`（排除 `api/keys.ts`、`__tests__`），断言不含内联 `['iam','users'` 或 `['iam','depts'` 字面量；queryKey 引用来自 `keys`。
3. **INV-5**：断言 `users/**` 中除 `api/schema.ts` 外，无手写 `interface UserDto`/`interface DeptDto`。
4. **INV-3**：断言 `list/**`、`detail/**` 组件 props 类型中不出现 `Dispatch<SetStateAction` / `set[A-Z]\w*:` 形态的 setState 直传（正则近似）。
5. **pro 层纯净**：断言 `components/pro/DataTable.tsx`、`Tree.tsx` 不含 `@/modules/` import、不含 `useTranslation`。
6. **结构合规**：断言 `users/` 下存在 `index.tsx`/`api/`/`mocks/`/`list/`/`detail/`/`form/`，且不存在 `pages/` 子目录（防止回退横切）。

> 门禁哲学：**约定即测试**。凡本 spec 的 INV，必须有一条自动化断言守住，否则改造视为未完成。守卫测试与结构改动**同一步、同一 commit** 提交（见 Step 8），不允许「先改结构、测试留到最后补」。

---

## 9. 执行顺序（严格按序，每步后跑 §10）

| Step | 内容 | 产出 | 依赖 |
| --- | --- | --- | --- |
| 0 | 环境/脚本校验 + 写《行为基线》+ 归档三档视觉基线（见 §0.5，不写业务代码） | 基线锚点 | — |
| 1 | 新建/确认 `pro/DataTable`（TanStack ColumnDef + 受控行选择）+ theme-states 样例 | 基础层 | 0 |
| 2 | 新建 `pro/Tree` + theme-states 样例 | 基础层 | — |
| 3 | 建 `users/api/`（schema/keys/user/dept/index）+ `users/mocks/`；改 `src/mocks/handlers.ts` 聚合 import | 数据契约层 | — |
| 4 | 建 `users/model.ts`、`types.ts`；建 `index.tsx`（骨架）；建 `list/`（Scene/Tree/Table/Toolbar/DeptScene/columns） | 页面主体 | 1,2,3 |
| 5 | 状态归属落位：MembersScene 持表单/详情/删除状态 + useUserMutations | 状态层 | 4 |
| 6 | 建 `detail/`（UserDetailPage + ProfileTab + PermissionTab） | 详情 | 3,5 |
| 7 | 建 `form/`（UserFormDialog + useUserForm，接 RHF+zod） | 表单 | 3,5 |
| 8 | 改路由壳 `routes/_auth/admin/users.tsx` import 到新路径；删除 `pages/users/`；写/更新守卫测试 | 收尾 | 4-7 |

> 每步只做该步范围。Step 4 之前 `pages/users/` 仍在、旧引用仍可编译；Step 8 才切换 import 并删除旧目录，保证中间态可编译。

---

## 10. 验收门禁（每步必跑，全绿才进下一步）

```bash
./node_modules/.bin/tsc -b --noEmit
./node_modules/.bin/eslint src
./node_modules/.bin/vitest run
pnpm theme:guard
```

**Step 8 完成后额外跑**：

```bash
./node_modules/.bin/tsc -b && ./node_modules/.bin/vite build
# 断言生产包无 mock 残留
grep -R -E "faker|msw|mockServiceWorker" dist && echo "FAIL: mock leaked" || echo "OK: mock stripped"
```

**视觉回归验收（对比 Step 0 基线，给出明确阈值）**：
- 跑 `pnpm visual`（或实际 script），对成员/部门/离职三页 × 90%/100%/108% 三档，与 `test-results/baseline-users/` 基线做 diff。
- **通过标准**：非文本内容区 diff < **0.5%**，且**无功能性差异**（不缺按钮、不少列、不丢状态）。仅因文本渲染微差导致的高百分比，须结合 diff 图判定为非功能性方可放行（沿用 AGENTS「diff 百分比只作证据、须结合 diff 图判断性质」）。
- 超阈值或出现功能性差异 → 视为回归，不得通过；定位到具体差异并修复或记 `SPEC-QUESTION`。

**行为回归验收（对比 Step 0 行为基线）**：
- 逐条对照 `docs/baselines/users-behavior-baseline.md`，确认三 tab、树选中过滤、分页、行选择（单选/全选本页/半选/翻页清空）、批量停用、新建/编辑/删除/详情、各筛选项的表现与基线**逐条等价**。
- 在 DoD 中以勾选清单形式给出比对结果，不允许笼统声称「行为一致」。

---

## 11. 完成定义（DoD）

改造达成，当且仅当：

- [ ] Step 0 基线已固化（环境校验通过、《行为基线》文档存在、三档视觉基线已归档）。
- [ ] §1 目标结构完全落地；`pages/users/` 已删除；无死代码/孤儿 import。
- [ ] §8.1 现有守卫已按表迁移（旧断言改路径/保留，无因结构改造而误留的红测试）。
- [ ] §2 全部 INV 有对应绿色守卫测试（§8.2）。
- [ ] `index.tsx` 无任何 query/mutation（INV-1 测试绿；`useState` 允许）。
- [ ] 所有 queryKey 来自 factory（INV-4 测试绿）；全仓 grep 无内联 `['iam','users'`。
- [ ] DTO 类型唯一来自 `api/schema.ts`（INV-5 测试绿）。
- [ ] MembersScene / MembersTable / DeptTree / UserFormDialog 均按 §6/§7 的 props 契约实现，`variant='left'` 通过传 undefined 回调关闭写能力（非两套组件）。
- [ ] i18n key 复用现有、无重命名；新增 key 已 zh-CN/en-US 同步（§6.8）。
- [ ] **行为回归**：逐条对照《行为基线》，三 tab / 树过滤 / 分页 / 行选择（单选/全选本页/半选/翻页清空）/ 批量停用 / 新建·编辑·删除·详情 / 各筛选项，全部等价（以勾选清单呈现，见 §10）。
- [ ] **视觉回归**：三页×三档 diff < 0.5% 且无功能性差异（对比 Step 0 基线）。
- [ ] §10 全部门禁绿；生产包无 mock 残留。
- [ ] 每步已独立 commit；每个 `// SPEC-QUESTION:` 已在 PR 描述中列出并说明处置。

---

## 附录 A：状态归属速查表（消除「这个状态放哪」的判断）

| 状态 | 归属 | 理由 |
| --- | --- | --- |
| 表格行选择 / 分页页码 | `pro/DataTable` 内部 | 纯 UI，仅表格自身消费 |
| 表单草稿 / 校验态 | `form/useUserForm`（RHF） | 提交即弃，仅表单消费 |
| 表单开关 create/edit | `MembersScene` | 触发在表格、影响面在成员场景，最近公共父 = Scene |
| 详情目标 detailUserId | `MembersScene`（存 id 不存 dto） | 同上；详情数据由 detail 内层自拉 |
| 删除确认 deleteTarget | `MembersScene` | 同上 |
| 当前部门 deptId | `MembersScene` | 左树与右表的最近公共父 |
| 当前 tab | `index.tsx` | 三个 tab 面板的最近公共父 |
| 筛选条件（status/keyword/page/deptId） | URL search（路由壳） | 可分享/可后退/刷新不丢 |
| server 数据（users/depts/detail） | queryClient 缓存 | 不 own 在组件，谁用谁 useQuery，按 key 复用 |

## 附录 B：数据一致性规则（配合数据下沉）

- 跨组件数据同步**只经 `invalidateQueries(userKeys.all)`**，不经 props 传数据、不经状态上提。
- 写操作成功 → 失效 → 相关 `useQuery` 自动后台重取（stale-while-revalidate）。
- 若某写操作同时影响部门成员数，额外 `invalidateQueries({ queryKey: deptKeys.all })`。
- staleTime 分档见 §4.3；准静态数据（部门）设长 staleTime 以省请求，易变数据（成员/详情）保持默认 0。
