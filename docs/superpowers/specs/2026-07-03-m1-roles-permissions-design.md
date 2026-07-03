# M1 角色与权限设计文档

- 日期：2026-07-03
- 状态：执行中
- 视觉基准：`后台管理脚手架.dc.html` 的 `ROLES & PERMISSIONS` 屏
- 上游约束：M0 已完成后台管理骨架、成员与部门页、轻量 `TableShell` / `StatusBadge` / `ConfirmDialog`，当前阶段不预置 HR、CRM、Project 等未来子系统

## 1. 目标

M1-A 交付 `/admin/roles` 角色与权限页面，按原型完成业务角色、权限树、角色成员、操作日志和管理员权限两大 tab 的前端闭环。页面要能被菜单访问、受页面权限守卫保护、通过 mock API 读写数据，并纳入 Agent Browser 视觉验收。

成功标准：

1. 视觉结构与原型一致：外层面板、顶部 tab、左侧角色列表、右侧详情、权限树、成员卡片、日志列表、管理员角色表格都按原型落地。
2. 数据闭环真实：新增自定义角色、删除自定义角色、保存角色权限、新增管理员角色都写入 MSW 内存数据，刷新查询可读回。
3. 权限边界清楚：页面级权限为 `iam:role:view`；按钮级权限覆盖 `iam:role:create`、`iam:role:del`、`iam:role:grant`、`iam:admin:create`。
4. 不破坏 M0：成员页、dashboard、登录、菜单权限过滤、三档显示比例和已有测试继续通过。
5. 验收可复现：单测、类型检查、lint、Agent Browser 截图与 diff 报告均可运行。

## 2. 非目标

- 不实现 HR、CRM、Project 等未来子系统空壳。
- 不抽象通用 DataTable。角色页不是普通表格页，先保持页面高内聚。
- 不把保存后的角色权限实时反写到当前登录用户的 `me.permissions`。当前登录授权仍来自 auth mock 的用户权限；角色归属与登录态授权模型留到 M1-B。
- 不实现菜单/权限资源编辑器。权限目录在本阶段由前端 mock 种子提供。
- 不接真实后端。本阶段验证的是前端契约、页面状态和 mock 数据闭环。

## 3. 信息架构

入口：

- 菜单组：`组织与权限`
- 菜单项：`角色与权限`
- 路由：`/admin/roles`
- 路由 staticData：
  - `labelKey: roles.title`
  - `groupKey: roles.breadcrumbGroup`
  - `permission: iam:role:view`
  - actions：`iam:role:create`、`iam:role:del`、`iam:role:grant`、`iam:admin:create`

页面布局：

1. 面包屑：`组织与权限 › 角色与权限`
2. 主面板顶部 tab：
   - `业务角色`
   - `管理员权限`
3. 业务角色 tab：
   - 左侧角色列表：搜索角色、系统/自定义标签、新增角色入口
   - 右侧详情：角色名称、类型、描述、自定义角色删除入口
   - 详情 tab：权限配置、角色成员、操作日志
4. 管理员权限 tab：
   - 说明文案
   - 新增管理员角色入口
   - 管理员角色表格

## 4. 数据模型

`RoleDto`：

```ts
interface RoleDto {
  id: string;
  name: string;
  type: 'system' | 'custom';
  desc: string;
  memberDeptId?: string;
}
```

`PermissionTreeGroupDto`：

```ts
interface PermissionTreeGroupDto {
  id: string;
  label: string;
  resources: {
    id: string;
    label: string;
    code: string;
    actions: { id: string; label: string }[];
  }[];
}
```

角色权限保存形状为 `Record<string, string[]>`，key 是 resource id，value 是 action id 数组。UI 层可派生权限符，例如 `iam:user:view`，但 mock 保存时保留原型的 resource/action 结构，避免提前耦合后端权限表。

`RoleMemberDto` 复用成员种子数据派生：

```ts
interface RoleMemberDto {
  id: string;
  name: string;
  deptLabel: string;
  title: string;
}
```

`RoleLogDto`：

```ts
interface RoleLogDto {
  id: string;
  kind: 'grant' | 'add' | 'remove' | 'edit' | 'create';
  who: string;
  text: string;
  time: string;
}
```

`AdminRoleDto`：

```ts
interface AdminRoleDto {
  id: string;
  name: string;
  type: 'system' | 'custom';
  admin: string;
  scope: string;
}
```

## 5. API 契约

- `GET /api/roles`：角色列表
- `POST /api/roles`：新增自定义角色
- `DELETE /api/roles/:id`：删除自定义角色；系统角色返回业务错误
- `GET /api/permissions/tree`：权限目录
- `GET /api/roles/:id/permissions`：读取角色权限
- `PUT /api/roles/:id/permissions`：保存角色权限
- `GET /api/roles/:id/members`：读取角色成员
- `GET /api/roles/:id/logs`：读取角色操作日志
- `GET /api/admin-roles`：管理员角色列表
- `POST /api/admin-roles`：新增管理员角色

Query key：

- `['iam', 'roles']`
- `['iam', 'permissions', 'tree']`
- `['iam', 'rolePermissions', roleId]`
- `['iam', 'roleMembers', roleId]`
- `['iam', 'roleLogs', roleId]`
- `['iam', 'adminRoles']`

写操作成功后只失效对应前缀，不全量刷新页面。

## 6. 交互细节

业务角色：

- 角色搜索仅过滤左侧角色列表，不改 URL。
- 默认选中第一个角色；创建角色后自动选中新角色。
- 系统角色不能删除；自定义角色显示删除入口。
- 删除当前自定义角色后选中剩余第一个角色。
- 角色成员和日志为读取视图，本阶段不做成员移除写操作。

权限配置：

- 权限树支持三层：模块组、资源、动作 chip。
- 组 checkbox 根据组内动作授权数量派生 `none / some / all`。
- 资源 checkbox 根据资源动作授权数量派生 `none / some / all`。
- 点击动作 chip 切换单个动作。
- 点击资源 checkbox 批量切换该资源。
- 点击组 checkbox 批量切换该组。
- `展开` / `折叠` 控制所有组。
- `清空` 清空当前角色全部动作。
- `全部授权` 授权当前角色全部动作。
- `重置` 回到服务端当前值。
- `保存权限` 调用 API 写入；成功后显示 toast。

管理员权限：

- 表格列为角色名称、管理员、权限范围、操作。
- 新增管理员角色 modal 选择成员时使用现有成员种子。
- 详情 / 添加作为 M1-A 视觉入口保留，不做真实流程，点击给 toast。

## 7. 组件边界

新增文件：

- `src/modules/admin/api/role.api.ts`：DTO、queryOptions、写 API。
- `src/modules/admin/mocks/role.handlers.ts`：角色、权限、管理员 mock handlers。
- `src/modules/admin/components/roles/RolesView.tsx`：页面级组合和交互。
- `src/routes/_auth/admin/roles.tsx`：路由、权限、query/mutation glue。
- 对应测试文件。

不新增公共 DataTable。可复用：

- `TableShell`：管理员权限表格壳。
- `StatusBadge`：角色类型标签不复用状态色，使用页面内 token 样式。
- `ConfirmDialog`：删除自定义角色确认。
- shadcn `Dialog`、`Input`、`Button`。

## 8. 测试策略

TDD 优先顺序：

1. API query key 与 mutation 方法测试。
2. MSW handler 测试：新增/删除角色、系统角色禁止删除、权限保存读回、新增管理员读回。
3. `RolesView` 测试：
   - viewer 可看页面但看不到新增/删除/保存入口。
   - admin 可新增角色并自动选中。
   - 自定义角色可删除，系统角色不显示删除。
   - 权限动作、资源、组、全选、清空、重置、保存回调正确。
   - 角色成员和日志 tab 可切换。
   - 管理员权限 tab 可新增管理员角色。
4. 菜单树测试补充：有 `iam:role:view` 时出现角色与权限菜单，无该权限时不出现。

验收命令：

```bash
./node_modules/.bin/tsc -b --noEmit
./node_modules/.bin/vitest run
./node_modules/.bin/eslint src
node scripts/visual-agent-browser.mjs all
```

## 9. 视觉验收

视觉脚本新增 `roles` 场景：

- 原型：打开 `后台管理脚手架.dc.html`，切换到 `角色与权限`。
- 实现：登录 admin，打开 `/admin/roles`。
- 截图：`prototype-roles.png`、`app-roles.png`、`diff-roles.png`。
- 断言文本：`角色与权限`、`业务角色`、`权限配置`、`管理员权限`。

人工审查重点：

- 左侧角色列表宽度、行高、选中背景与原型一致。
- 右侧详情 tab、权限 toolbar、权限树分组、动作 chip 间距接近原型。
- 管理员权限表格行高和列比例接近原型。
- 90% / 100% / 108% 下不出现横向溢出；权限树、弹窗、管理员表格不截断。

## 10. Review 清单

规格审：

- 范围是否只覆盖 M1-A。
- API 契约是否支持当前页面闭环。
- 非目标是否明确，避免误把 mock RBAC 写成真实授权系统。

UI 审：

- 页面结构是否贴近原型，而不是普通后台列表页。
- 关键控件是否使用 token、`--app-scale` 和现有视觉语言。
- checkbox / chip / tab / modal 是否有非原生质感。

架构审：

- route 只做 query/mutation glue。
- API 和 mock 分层清楚。
- 页面状态留在 `RolesView`，服务端状态走 Query。
- 没有提前抽象 DataTable。

工程规则审：

- 组件代码不新增 hex 色值和 `rounded-[Npx]`。
- 代码英文，注释中文。
- 不破坏生产 mock 剥离机制。
- 验证命令实际运行通过。

## 11. 执行验收记录

2026-07-03 M1-A 实现后已完成以下验收：

- `./node_modules/.bin/tsc -b --noEmit`：通过。
- `./node_modules/.bin/vitest run`：20 个测试文件通过，164 个测试通过。
- `./node_modules/.bin/eslint src`：通过。
- `pnpm build`：通过，生产构建产物未被 git track。
- `node scripts/visual-agent-browser.mjs all`：通过脚本文本断言、截图采集和三档显示比例检查。

视觉验收产物：

- 原型基线：`e2e/baseline/prototype-roles.png`。
- 实现截图：`test-results/m0-visual/app-roles.png`。
- 差异图：`test-results/m0-visual/diff-roles.png`。
- 角色页 diff：`35978 / 1296000` pixels，约 `2.78%`。
- 三档比例：`sm` / `md` / `lg` 均通过无横向溢出、管理员角色弹窗在视口内。

人工结论：

- 角色页主体结构、左侧角色索引、右侧权限树、管理员权限表与原型保持一致，没有发现内容错屏、缺失控件或明显布局错位。
- 剩余视觉差异主要来自字体渲染、全局 chrome、lucide 与原型手写 SVG 的图标路径差异；不属于阻断性功能或布局偏差。
- M1-A 未把角色权限反写到当前登录用户权限，这是设计边界，不是遗漏。
