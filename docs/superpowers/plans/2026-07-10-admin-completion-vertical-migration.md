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

## 2026-07-10 完成回证

- Roles、Menus 已迁移到与 Users 一致的纵切包；旧横切 API、Mock 与页面目录已删除，Dashboard 是唯一保留的 `modules/admin/pages` 遗留。
- Dictionaries、Messages、Logs、Files、Company、Profile、Register、Forgot Password 已完成 Mock CRUD/状态回读，Shell 消息和个人中心入口已接入真实页面。
- 文件、日志与尾程导出统一通过 `fetch -> Blob -> object URL` 下载，避免开发态 Mock API 被 Vite HTML 回退页替代；CSV 与 PDF 已由 Agent Browser 下载并检查文件类型/内容。
- 全仓最终门禁：TypeScript 通过；ESLint 0 error（仅 TanStack Table 已知 React Compiler warning）；Vitest 103 files / 609 tests；theme guard 4 files / 194 tests；design lint 0 error；生产构建通过且 `dist` 无 faker/MSW/worker 标记；`git diff --check` 通过。
- Agent Browser 完成 Admin 页面关键交互回证，并将 20 个 Admin/Lastmile 主场景纳入同一视觉报告；90%/100%/108% 三档比例无整页水平溢出，24/24 flavor × mode × scale 主题矩阵通过。
- 原型/实现像素差异范围为 1.96%–8.59%。差异主要来自脚手架真实 Shell、权限动作、工程化筛选/表格和原型静态演示结构，不通过删除真实功能或恢复假按钮压低差异。

## 2026-07-10 全面复审与加固回证

### 审查发现与处置

- P1：新增页面的部分 Query 消费方在加载或失败时直接返回空白；已新增通用 `QueryState`，并为页面级 Query 与 `DataTable` 统一接入加载、失败、重试状态，同时纳入 `/dev/theme-states` 与主题守卫。
- P1：文件下载、日志导出、账单导出和面单下载存在未捕获 Promise，失败会形成未处理拒绝；已统一改为 Mutation 状态机，提供 loading、失败反馈和回归测试。
- P1：文件分享复制了不存在的 `/files/:id` 地址，且无 Clipboard 时仍可能显示成功；已改为受控 `fileId` URL 状态 `/admin/files?fileId=...`，支持刷新直达、失败反馈和深链回归测试。
- P1：登录页短信验证码与扫码登录只有静态外观，没有 API、Mock 会话与登录闭环；已补齐 zod contract、API、MSW handler、token/session 回读和浏览器实测。短信 Mock 验证码为 `123456`，扫码页提供明确的 Mock 确认入口。
- P1：768px 宽度仍保留 232px Sidebar，Header 被挤压且消息详情出现逐字换行；Shell 已在紧凑视口强制折叠为 64px，压缩 Header 控件，消息中心改为上下分区，并保留宽屏用户布局偏好。
- P2：渠道草稿按钮只提示成功而不保存；已持久化到 localStorage，重新进入新增页可恢复，正式创建后清理草稿。
- P2：渠道 KPI 受列表筛选影响，指标语义不稳定；Mock 列表响应已增加独立全局 `stats`，筛选只影响 `list/total`。
- P2：Menus 存在内联 Query key；已补 key factory 并增加纵切业务包禁止内联 `queryKey` 的架构守卫。
- P2：认证业务层仍有裸 `<button>`；已迁移到公共 `Button`，并用守卫禁止回归。

### 复审门禁

- TypeScript strict 通过；ESLint 0 error，仅保留 TanStack Table 与 React Compiler 的上游兼容性 warning。
- Vitest：104 files / 624 tests 全部通过；theme guard：4 files / 196 tests 全部通过；design lint：0 error。
- 生产构建通过；`dist` 二次扫描不含 `faker`、`msw/browser`、`msw/node` 或 `mockServiceWorker`。
- Agent Browser 实测短信登录、扫码登录、文件深链和 768px 紧凑布局；浏览器错误日志为空。
- 视觉报告于 2026-07-10 20:09 刷新：20/20 主场景、三档比例、24/24 主题矩阵通过；像素差异范围保持 1.96%–8.59%，最高差异页经实现图与 diff 图人工复核，不存在错页、白屏、浮层越界或整页水平溢出。

### 边界说明

- 本轮所有新 Admin 业务以及 Roles、Menus 均已使用 Users 纵切模板。`modules/admin/pages/dashboard` 与 `modules/admin/api/dashboard.api.ts` 是仓库既存、计划中明确保留的唯一横切遗留，不属于本轮新实现或 Roles/Menus 迁移的降级例外；后续若迁移 Dashboard，必须一次性按同一纵切骨架完成，不能做半迁移。

## 2026-07-10 菜单三栏重构补充回证

- 菜单工作区调整为“子系统管理 / 菜单管理 / 菜单详情”三栏，桌面端比例为 2:3:5；窄屏由 Sheet 承载子系统与详情。
- 子系统恢复为纵向卡片；三栏骨架、Pane Header/Footer 和卡片状态沉到 Pro 层，业务页面只保留数据与语义回调。
- 最终全量 Vitest 为 110 files / 649 tests；theme guard 为 4 files / 196 tests；TypeScript、ESLint、生产构建与 Mock 剥离扫描通过。
- Agent Browser 重新采集菜单页，并复核 90% / 100% / 108% 三档无整页水平溢出、菜单编辑弹窗保持在视口内。
