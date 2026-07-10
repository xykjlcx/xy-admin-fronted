# 角色管理、数据权限与操作日志重构设计

- 日期：2026-07-10
- 状态：已实现并完成首轮验收
- 影响页面：`/admin/roles`
- 上游约束：当前 `roles` 仍是 `modules/admin/pages/roles` 横切遗留，本次只在现有边界内完成产品重构，不顺带迁移整个业务包

## 1. 目标

将原本割裂的“业务角色”和“管理员权限”统一成一个角色模型，使角色、成员、功能权限、数据权限和审计记录围绕同一个角色 ID 运转。

成功标准：

1. 页面主 Tab 调整为“角色管理 / 操作日志”。
2. 超级管理员、平台负责人、人事、财务、IT 等角色统一出现在左侧角色列表。
3. 角色详情固定为“功能权限 / 数据权限 / 角色成员”三个 Tab，不再保留角色内操作日志。
4. 数据权限支持角色默认范围和按数据资源覆盖，保存后可通过 mock API 读回。
5. 操作日志使用现有 `DataTable` 汇总全部角色变更，能回答“谁在何时对哪个角色改了什么”。
6. 保持现有权限控制、角色创建删除、功能权限配置、成员展示和中英文能力可用。

## 2. 非目标

- 不实现字段级、行级表达式或任意 ABAC 条件编辑器。
- 不把前端权限配置升级为生产安全边界；真实后端仍必须执行授权和数据过滤。
- 不在本轮实现成员添加、移除或批量授权的新流程。
- 不迁移整个 roles 横切遗留为纵切模块。
- 不修改 `components/ui`、`components/pro` 的公开视觉契约；页面复用现有组件与 token。

## 3. 信息架构

页面主 Tab：

1. `角色管理`
2. `操作日志`

“角色管理”沿用当前左右主从布局：左侧是可搜索的角色列表，右侧是当前角色详情。左侧统一展示系统角色和自定义角色，不再存在管理员角色的独立列表、创建弹窗或详情入口。

首批 mock 角色：

- 超级管理员
- 平台负责人
- 人事
- 财务
- IT
- 法务
- 运营
- 日志审计员
- 文件管理员

原“人事管理员”吸收到“人事”角色，避免出现职责相同、名称不同的重复角色。原“超级管理员”“日志审计员”“文件管理员”转为普通角色记录。平台负责人作为系统角色补入。

角色详情 Tab 顺序：

1. `功能权限`
2. `数据权限`
3. `角色成员 · {{count}}`

## 4. 统一角色模型

移除 `AdminRoleDto` 和 `CreateAdminRoleInput`。所有角色使用同一个 `RoleDto`：

```ts
const RoleSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['system', 'custom']),
  desc: z.string(),
  memberDeptId: z.string().optional(),
});
```

系统角色与自定义角色的区别保持不变：系统角色不可删除，自定义角色可删除。角色类型不再表达“管理员 / 业务角色”，管理员能力由功能权限和数据权限共同决定。

删除以下旧能力：

- `GET /api/admin-roles`
- `POST /api/admin-roles`
- `adminRolesQuery`
- 管理员角色专用 DTO、mock collection、面板和创建弹窗
- `iam:admin:create` 前端按钮权限声明

## 5. 功能权限

现有权限树和保存逻辑保持不变，只将 Tab 和相关文案从“权限配置”明确为“功能权限”。

功能权限继续表达页面和按钮动作，例如：

- `iam:user:view`
- `iam:user:create`
- `iam:role:grant`
- `file:doc:download`

保存继续使用：

- `GET /api/roles/:id/permissions`
- `PUT /api/roles/:id/permissions`
- query key：由统一 `roleKeys.permissions(roleId)` factory 生成

## 6. 数据权限

### 6.1 设计原则

数据权限采用“角色默认范围 + 按资源覆盖”，不使用单一全局范围，也不引入任意规则编辑器。

支持的范围：

- `all`：全部数据
- `deptAndChildren`：本部门及下级部门
- `dept`：仅本部门
- `self`：仅本人数据
- `custom`：自定义部门
- `inherit`：资源继承角色默认范围；仅用于资源覆盖项

“本部门”和“本人”在真实系统中应以当前登录成员为上下文，由后端解析。前端只提交范围策略，不计算或假装执行生产级数据过滤。

### 6.2 数据契约

```ts
const DataScopeSchema = z.enum(['all', 'deptAndChildren', 'dept', 'self', 'custom']);

const ResourceDataPermissionSchema = z.object({
  scope: z.enum(['inherit', 'all', 'deptAndChildren', 'dept', 'self', 'custom']),
  departmentIds: z.array(z.string()),
});

const RoleDataPermissionSchema = z.object({
  defaultScope: DataScopeSchema,
  defaultDepartmentIds: z.array(z.string()),
  resources: z.record(z.string(), ResourceDataPermissionSchema),
});
```

约束：

- 只有 `custom` 可以保存非空 `departmentIds`。
- 非 `custom` 范围保存时必须清空对应部门 ID。
- 资源选择 `inherit` 时必须清空资源自己的部门 ID。
- mock API 同样执行上述规范化，避免只靠 UI 自觉。

API：

- `GET /api/roles/:id/data-permissions`
- `PUT /api/roles/:id/data-permissions`
- query key：由统一 `roleKeys.dataPermissions(roleId)` factory 生成

### 6.3 页面结构

数据权限顶部提供默认范围选择。选择“自定义部门”时显示部门多选控件；其他范围不显示无效配置。

下方展示资源覆盖表，首批数据资源为：

- 成员与部门
- 文件管理
- 通知公告
- 操作日志

每行包含：数据资源、生效范围、自定义范围。生效范围默认为“继承角色默认值”；只有选择“自定义部门”时展示该行的部门选择。

页面底部操作与功能权限保持一致：

- `重置`：恢复服务端当前值
- `保存数据权限`：规范化后写入 API，成功后失效当前角色数据权限 query

`iam:role:grant` 同时控制功能权限和数据权限的保存能力；无该权限的用户仍可查看，但看不到保存入口。

## 7. 全局操作日志

删除按角色加载的详情日志：

- `GET /api/roles/:id/logs`
- `roleLogsQuery(roleId)`

改为全局审计查询：

- `GET /api/role-audit-logs`
- query key：由统一 `roleKeys.auditLogs()` factory 生成

日志 DTO：

```ts
const RoleAuditLogSchema = z.object({
  id: z.string(),
  occurredAt: z.string(),
  operator: z.string(),
  roleId: z.string(),
  roleName: z.string(),
  kind: z.enum(['create', 'edit', 'grant', 'remove', 'dataScope']),
  change: z.string(),
});
```

操作日志使用现有 `DataTable`，列为：

1. 操作时间
2. 操作人
3. 角色
4. 变更类型
5. 变更内容

表格上方提供关键词、角色、变更类型筛选。筛选状态只服务当前主 Tab，不进入路由 search；日志当前为完整 mock 列表，不做假分页。空结果和加载状态由 `DataTable` 统一承载。

角色、功能权限和数据权限写操作成功后，除失效自身 query 外还要失效 `roleKeys.auditLogs()`，让操作日志能反映最新变更。mock handler 为这些写操作追加审计记录。

## 8. 数据流与组件边界

- `RolesPage` 只编排主 Tab 和角色列表；角色数据继续来自 TanStack Query。
- 角色详情只持有当前 `roleId` 和详情 Tab UI 状态，不持有 DTO 副本。
- 功能权限、数据权限、角色成员由各自消费组件请求对应 query，避免顶层同时等待全部详情数据。
- 操作日志主 Tab 自己请求全局日志，不依赖当前角色。
- `DataTable` 只接收列定义、数据、loading 和空状态文案，不引入角色业务逻辑。
- 页面层只使用布局类；交互状态样式复用 `components/ui`、`components/pro` 和现有 token。
- 由于 roles 尚未纵切，本轮先在现有 `role.api.ts` 集中提供 `roleKeys` factory，并把该文件内既有角色 query key 一并迁入 factory；未来纵切时再原样移动到业务包 `api/keys.ts`，不新增内联字符串数组。

建议组件调整：

- 保留并改造 `RoleDetailsPanel.tsx`
- 保留 `RolePermissionEditor.tsx`，文案改为功能权限
- 新增 `RoleDataPermissionEditor.tsx`
- 将 `RoleLogsPanel.tsx` 改为全局 `RoleAuditLogsPanel.tsx`
- 删除 `AdminRolesPanel.tsx`
- 从 `RoleDialogs.tsx` 删除管理员角色创建部分

## 9. 权限、加载与错误状态

- 页面查看权限仍为 `iam:role:view`。
- 新增、删除角色仍使用 `iam:role:create`、`iam:role:del`。
- 功能权限和数据权限保存统一使用 `iam:role:grant`。
- 操作日志主 Tab 对已进入角色页的用户可见；日志内不提供写操作。
- 角色切换时只让右侧当前 Tab 显示 skeleton，左侧列表和顶部主 Tab 保持稳定。
- 保存失败沿用全局 MutationCache 错误提示，并保留当前草稿。
- 日志加载失败和数据权限加载失败不能清空其他已经可用的角色信息。

## 10. TDD 与验收

测试按以下顺序先红后绿：

1. API contract 测试：新 query key、数据权限规范化、旧管理员角色 API 消失。
2. MSW handler 测试：统一角色列表、数据权限读写回读、写操作追加全局审计日志。
3. 页面行为测试：
   - 主 Tab 只有“角色管理 / 操作日志”。
   - 超级管理员和平台负责人出现在左侧列表。
   - 角色详情只有“功能权限 / 数据权限 / 角色成员”。
   - 数据权限默认范围、资源覆盖、自定义部门、重置和保存行为正确。
   - viewer 只能查看，admin 可以保存。
   - 操作日志表格能展示并筛选操作人、角色和变更内容。
4. 架构守卫：roles 页面不使用原生交互控件、不内联 style、不重新引入管理员角色分支。

完成前运行：

```bash
./node_modules/.bin/tsc -b --noEmit
./node_modules/.bin/eslint src
./node_modules/.bin/vitest run
pnpm theme:guard
pnpm design:lint
pnpm build
```

生产构建后检查 `dist` 不包含 `faker`、`msw`、`mockServiceWorker`。

浏览器验收：

- 登录管理员账号后打开 `/admin/roles?roleId=fin`。
- 验证角色管理、数据权限保存读回、操作日志筛选。
- 验证浅色/深色主题。
- 验证 90% / 100% / 108% 显示比例，无横向溢出、浮层错位或内容截断。
- 保存实现前后的截图，检查信息层级、表格密度和主从结构是否保持克制、清晰、可扫描。

## 11. 兼容与清理

- 保留现有 `roleId` URL search 语义，刷新和复制链接后仍可恢复当前角色。
- 当 URL 中的角色被删除或不存在时，回退到列表第一个角色。
- 中英文资源同步更新，不新增组件内硬编码中文。
- 旧管理员角色文案、类型、接口、query、组件、测试和权限声明全部清理，避免保留不可达分支。
- 更新历史角色设计文档的状态说明时只标注“已被本规格替代”，不改写历史验收记录。

## 12. 首轮验收记录

2026-07-10 已完成：

- API、mock、页面、路由预取与架构守卫定向测试：29 个通过。
- 全量 Vitest：63 个文件、504 个测试通过。
- `tsc -b --noEmit --force`：通过。
- ESLint：0 error；现有 `DataTable` 的 TanStack Table React Compiler 兼容提示为 1 条 warning。
- `theme:guard`：4 个文件、182 个测试通过。
- `design:lint`：0 error；40 条均为既有白名单 warning。
- `pnpm build`：通过；`dist` 未检出 `faker`、`msw`、`mockServiceWorker`。
- Agent Browser：角色管理、数据权限保存、操作日志搜索、浅色/深色均通过，控制台无新错误。
- `pnpm visual:scale`：90% / 100% / 108% 三档通过；角色数据权限表在 108% 下无内部或整页横向溢出。
- 三档报告：`test-results/m0-visual/report.md`。
