# Admin 完整化与纵切迁移实施计划

关联设计：`docs/superpowers/specs/2026-07-10-admin-completion-vertical-migration-design.md`

## 执行原则

- 当前工作区是唯一真相源，保留现有 Roles、Menus、DataTable、主题和文案改动。
- 每项生产代码之前必须存在对应失败测试，并记录 RED 的真实失败原因。
- 每个阶段完成后先局部验证，再做代码自审；发现问题立即修正并回写本计划。
- 新页面只采用 Users 纵切范式；不在 `modules/admin/pages`、`modules/admin/api`、`modules/admin/mocks` 增加新业务。
- Admin 未完成全量工程和视觉验收前，不启动 Lastmile。

## Task 1：收紧纵切架构守卫

修改：

- `src/app/__tests__/module-boundaries.test.ts`
- `src/app/__tests__/roles-page-standard.test.ts`

测试要求：

1. 所有 `/admin/*` 业务路由必须从 `@/modules/admin/<business>` 入口导入。
2. `modules/admin/pages` 最终只允许现存 Dashboard；Roles、Menus 不再列入白名单。
3. Roles、Menus 必须各自包含 `api/keys.ts`、`api/schema.ts`、`mocks/index.ts`、`list/`、`detail/`、`form/`、`__tests__/`。
4. Routes、Shell、tests 不再引用横切 role/menu API 和 handlers。

RED：只修改守卫并运行相关测试，确认因当前遗留路径失败。

## Task 2：迁移 Roles 纵切包

目标结构：

```text
src/modules/admin/roles/
├── index.tsx
├── api/{schema.ts,keys.ts,role.ts,index.ts,__tests__/role-api.test.ts}
├── mocks/{db.ts,role.handlers.ts,index.ts,__tests__/role-handlers.test.ts}
├── model.ts
├── types.ts
├── list/{RoleListPanel.tsx,RoleAuditLogsPanel.tsx}
├── detail/{RoleDetailsPanel.tsx,RolePermissionEditor.tsx,RoleDataPermissionEditor.tsx,RoleMembersPanel.tsx}
├── form/{RoleDialogs.tsx}
├── components/{PermissionControls.tsx,RoleTypeChip.tsx}
└── __tests__/{roles-view.test.tsx,roles-vertical-standard.test.ts}
```

步骤：

1. 先让现有 Roles API、handler、页面测试改为期望新入口并失败。
2. 移动当前工作区文件，保留未提交实现。
3. 把 schema、key factory、queryOptions/API 拆开，删除重复手写类型。
4. 把 handler 数据状态移入 `mocks/db.ts`，测试可重置。
5. 更新 route、route loader tests、主题快照和主题 guard 的路径。
6. 跑 Roles 局部测试、边界守卫、类型检查。

验收：Roles 现有行为、数据权限与审计日志全部保持；旧路径无引用。

## Task 3：迁移 Menus 纵切包

目标结构：

```text
src/modules/admin/menus/
├── index.tsx
├── api/{schema.ts,keys.ts,menu.ts,index.ts,__tests__/menu-api.test.ts}
├── mocks/{db.ts,menu.handlers.ts,index.ts,__tests__/menu-handlers.test.ts}
├── model.ts
├── types.ts
├── list/{MenuTreeTable.tsx}
├── detail/
├── form/{MenuFormDialog.tsx}
├── components/
└── __tests__/{menus-view.test.tsx,menus-vertical-standard.test.ts}
```

步骤与 Roles 相同；额外更新 `_auth.tsx`、Shell、导航测试对 menu/subsystem queries 的引用。

验收：菜单三栏工作区、子系统切换、CRUD、可见性和非叶子保护不退化；旧路径无引用。

## Task 4：用 Dictionaries 打通新页面纵切 Playbook

Dictionaries 是首个完整代表切片，覆盖主从结构、查询、CRUD、表单、启停、确认、权限、URL 与 Mock 数据。

先写失败测试：

- schema 与字典项唯一性。
- handler 的字典/字典项 CRUD、内置字典保护、启停回读。
- 页面目录选择、搜索、创建/编辑/删除、Switch 失败回滚。
- route staticData、manifest menuSeed 和纵切目录守卫。

再实现：

- `src/modules/admin/dictionaries/**`
- `src/routes/_auth/admin/dictionaries.tsx`
- `src/locales/{zh-CN,en-US}/admin.json`
- `src/modules/admin/manifest.ts`
- `src/mocks/handlers.ts`

完成后新增并维护：

- `docs/superpowers/admin-vertical-page-playbook.md`

Playbook 记录目录模板、schema/key/API/mock/route/i18n/manifest/test/视觉检查和常见错误，后续页面按它执行。

## Task 5：实现 Messages 与 Shell 未读联动

先写失败测试：

- 消息列表、详情、单条已读、全部已读、删除 handler。
- 全部/未读筛选和选择详情行为。
- NotificationBell 读取 Query 未读数并导航 `/admin/messages`。
- Route 权限、User/Shell 稳定性和错误重试。

实现：

- `src/modules/admin/messages/**`
- `src/routes/_auth/admin/messages.tsx`
- `src/app/shell/widgets/NotificationBell.tsx`
- manifest、handler 聚合和双语资源。

## Task 6：实现 Logs

先写失败测试：

- 操作日志/登录日志 schema 与分页筛选。
- handler 按 keyword/type/result/date 返回正确数据。
- CSV 导出只包含当前筛选结果。
- 页面 tab、URL search、表格、空态和错误恢复。

实现：

- `src/modules/admin/logs/**`
- `src/routes/_auth/admin/logs.tsx`
- manifest、handler 聚合和双语资源。

## Task 7：实现 Files 与 FileDropzone

先写失败测试：

- 文件夹层级、非空目录删除保护、上传/重命名/删除/下载元数据。
- 当前目录搜索、目录切换、列表/网格视图、预览。
- FileDropzone 的选择、拖拽、大小/类型校验、disabled/pending/错误状态。
- `/dev/theme-states` FileDropzone 状态矩阵和主题守卫。

实现：

- `src/components/pro/FileDropzone.tsx`
- `src/components/pro/__tests__/file-dropzone.test.tsx`
- `src/modules/admin/files/**`
- `src/routes/_auth/admin/files.tsx`
- manifest、handler 聚合、主题矩阵和双语资源。

## Task 8：实现 Company

先写失败测试：

- 企业信息 schema、联系人字段校验与 handler 回读。
- 查看/编辑/取消/保存/失败恢复。
- Route 权限和菜单种子。

实现：

- `src/modules/admin/company/**`
- `src/routes/_auth/admin/company.tsx`
- manifest、handler 聚合和双语资源。

## Task 9：实现 Profile 与 UserMenu 联动

先写失败测试：

- 资料更新、密码修改、偏好保存、设备列表与退出其他设备。
- 当前设备保护和业务错误。
- UserMenu 个人中心、账号设置、修改密码真实导航。

实现：

- `src/modules/admin/profile/**`
- `src/routes/_auth/admin/profile.tsx`
- `src/app/shell/widgets/UserMenu.tsx`
- handler 聚合和双语资源。

## Task 10：补全 Register 与 Forgot Password

先写失败测试：

- 注册 schema、密码确认、邮箱唯一性、新账号可登录。
- 找回密码邮箱校验、发送结果与重新发送状态。
- 三个 Auth 页面共享壳和键盘/错误反馈。

实现：

- `src/modules/admin/auth/**`
- `src/routes/register.tsx`
- `src/routes/forgot-password.tsx`
- 把现有 `/login` 页面接入 Auth 纵切入口，并保持原会话链路。
- auth handlers、双语资源和路由测试。

## Task 11：Admin 全量集成审查

检查：

- 所有新增路由、manifest、权限动作、Shell 入口和 Mock handler 都有消费方。
- 所有顶层 `index.tsx` 不持业务数据、不调用 Query/Mutation。
- 所有 DTO 从 schema 推导；无内联 query key、`any`、类型断言绕过。
- 业务层无原生控件、状态视觉类、硬编码中文、hex、任意圆角。
- 旧 role/menu 横切文件与引用清零，Dashboard 作为唯一 `pages/` 遗留明确记录。

发现问题先补失败测试再修复；审查结论回写本计划对应 Task。

## Task 12：Admin 工程与视觉验收

工程门禁：

```bash
./node_modules/.bin/tsc -b --noEmit
./node_modules/.bin/eslint src
./node_modules/.bin/vitest run
pnpm theme:guard
pnpm design:lint
pnpm build
rg -n "faker|msw|mockServiceWorker" dist
git diff --check
```

运行模式：

- Mock 开发态启动并完成关键 CRUD 浏览器回证。
- `VITE_ENABLE_MOCK=false` 生产构建成功，产物无 Mock 依赖特征。
- Agent Browser 采集 Admin 新页面原型、实现和 diff。
- 四套 flavor × light/dark × 90%/100%/108% 视觉矩阵无水平溢出和浮层错位。

验收后做一次 issue-first 代码审查和里程碑复盘；问题修完并重新跑全门禁，Admin 才能标记完成。

## Task 13：启动 Lastmile 阶段

仅在 Task 12 完成后执行：

1. 从 HTML 原型重新提取 Lastmile 页面、数据关系和交互清单。
2. 基于 Admin 纵切 Playbook 编写 Lastmile 设计和实施计划。
3. 按运营概览 → 运单主链 → 客户 → 渠道/承运商/供应商 → 计费推进。

完整 Goal 在 Lastmile 全量验收前保持 active。
