# Admin 完整化与纵切迁移设计

日期：2026-07-10
状态：待用户确认

## 1. 目标

先完成后台管理子系统的剩余页面和内核入口，使其在未接真实后端时也能通过 typed API + MSW 完成可重复的业务操作；同时把 `roles`、`menus` 从遗留横切目录迁移为与 `users` 一致的纵切包。Admin 全部通过工程与视觉验收后，再进入 `lastmile` 子系统。

本阶段不是静态页面补齐。每个可见操作都必须落到 Mock 契约、缓存失效、错误反馈和测试证据；原型中明确标注为占位的真实文件存储、PDF 渲染等外部能力除外。

## 2. 约束与真相源

优先级如下：

1. 当前代码和当前工作区改动。
2. `docs/architecture.md` 与根目录 `AGENTS.md`。
3. `后台管理脚手架.dc.html` 的页面结构、字段、交互与视觉。
4. 历史 spec 仅用于追溯，不覆盖当前架构。

当前 `main` 存在未提交的 Roles、Menus、DataTable、主题和文案改动。迁移必须保留这些改动，不回退、不用旧版文件覆盖；提交时只纳入本任务明确拥有的文件。

## 3. 范围与顺序

### 3.1 Phase A：遗留页面纵切迁移

- `modules/admin/pages/roles` → `modules/admin/roles`
- `modules/admin/pages/menus` → `modules/admin/menus`
- `modules/admin/api/role.api.ts` 及相关测试 → `modules/admin/roles/api/`
- `modules/admin/api/menu.api.ts` 及相关测试 → `modules/admin/menus/api/`
- `modules/admin/mocks/role.handlers.ts` → `modules/admin/roles/mocks/`
- `modules/admin/mocks/menu.handlers.ts` → `modules/admin/menus/mocks/`

迁移后两包均采用与 `users` 相同的固定结构：

```text
modules/admin/<business>/
├── index.tsx
├── api/
│   ├── schema.ts
│   ├── keys.ts
│   ├── <resource>.ts
│   └── index.ts
├── mocks/
│   ├── db.ts
│   ├── <resource>.handlers.ts
│   └── index.ts
├── model.ts
├── types.ts
├── list/
├── detail/
├── form/
├── components/
└── __tests__/
```

迁移只改变边界和组织方式，不删除现有角色管理、数据权限、操作日志、菜单三栏工作区和当前未提交优化。

### 3.2 Phase B：Admin 剩余业务页

| 页面 | 路由 | 纵切包 | Mock 可用闭环 |
| --- | --- | --- | --- |
| 消息中心 | `/admin/messages` | `admin/messages` | 全部/未读筛选、查看详情、单条已读、全部已读、删除 |
| 日志审计 | `/admin/logs` | `admin/logs` | 操作/登录日志、关键词与类型/结果筛选、分页、CSV 导出 |
| 文件管理 | `/admin/files` | `admin/files` | 文件夹导航、列表/网格切换、搜索、上传、新建文件夹、重命名、删除、预览、下载模拟 |
| 企业信息 | `/admin/company` | `admin/company` | 查看与编辑基本资料、联系人、校验、保存后回读 |
| 字典管理 | `/admin/dictionaries` | `admin/dictionaries` | 字典目录查询、新增/编辑/删除；字典项查询、新增/编辑/删除/启停 |
| 个人中心 | `/admin/profile` | `admin/profile` | 资料编辑、密码修改、偏好设置、登录设备查看与退出 |

企业信息和字典管理仍归 Admin 的“系统设置”导航组。消息中心与个人中心是 Shell 内核入口，同时拥有可直达路由，但消息中心不重复出现在普通侧栏菜单中；个人中心也不作为可删除业务菜单。

### 3.3 Phase C：鉴权补全

- `/login`：复用现有登录能力，不重写已验证的登录、401 和会话清理链路。
- `/register`：企业邮箱、姓名、密码、确认密码、协议确认；Mock 注册成功后回到登录页并可用新账号登录。
- `/forgot-password`：邮箱提交、发送状态、重新发送倒计时的前端状态；Mock 接口只模拟邮件发送结果，不伪造真实邮件服务。
- 三页复用 `modules/admin/auth` 中的 Auth Shell、schema、表单和 API 契约；Route 只保留 URL 与页面入口。

### 3.4 Phase D：Admin 收口后进入 Lastmile

Lastmile 不与 Admin 并行开发。Admin 的全部路由、Mock 闭环、主题矩阵和生产构建通过后，再为 Lastmile 单独生成设计与实施计划，按运营概览 → 运单主链 → 客户 → 渠道/承运商/供应商 → 计费中心推进。

## 4. 页面与交互设计

### 4.1 消息中心

- 左侧为消息列表，支持全部/未读切换和选中状态；右侧显示正文、时间和来源。
- 打开未读消息即调用已读 mutation；列表、详情和 Shell 未读数使用同一 key factory。
- “全部已读”和删除必须有 pending、成功与失败反馈。
- 无消息、筛选无结果和请求失败分别展示 Empty、空筛选提示和 ErrorScreen。

### 4.2 日志审计

- 页面顶层只管理操作日志/登录日志 tab。
- 两个 Scene 各自请求数据，筛选条件进入 URL search。
- 标准表格统一使用 `DataTable`，日期、IP、操作人、模块、结果等列按原型组织。
- 导出调用 Mock API 返回 CSV Blob；导出内容必须反映当前筛选条件，不导出未筛选的全量假数据。
- 日志为只读数据，不提供编辑和删除操作。

### 4.3 文件管理

- 顶部显示存储使用概览和当前目录面包屑；内容支持列表/网格视图。
- 文件夹进入、返回和搜索状态互不污染；搜索时明确显示跨当前目录还是当前目录，初版固定为当前目录。
- 上传由通用 `FileDropzone` 承载文件选择、拖拽、格式/大小反馈和 pending 状态；业务层只传限制和语义回调。
- Mock 上传只保存文件元数据和可预览的本地 object URL 生命周期信息，不宣称持久化存储。
- 图片显示真实浏览器预览；PDF 和其他文档使用原型允许的占位预览，同时提供文件元数据和下载模拟。
- 删除文件夹前检查非空状态；删除、重命名使用确认或表单弹窗。

### 4.4 企业信息

- 页面按“企业基本信息”和“企业联系人”两组展示，保持安静、紧凑的详情维护页风格。
- 编辑态使用同一份 Zod schema 与 React Hook Form；取消不污染 Query 缓存。
- 保存 mutation 成功后失效 company keys 并重新读取，页面展示来自 API 的回读结果。

### 4.5 字典管理

- 采用 `SideList + DataTable` 主从结构：左侧字典目录，右侧当前字典说明、搜索、字典项表格。
- 当前字典 id 是目录和详情的最近公共父状态；数据仍由左右消费者各自 query。
- 内置字典禁止删除，但允许按权限编辑字典项；禁用原因必须可见。
- 字典编码创建后不可修改；字典项值在同一字典内唯一。
- 删除字典或字典项必须确认，启停操作使用 Switch 并支持失败回滚。

### 4.6 个人中心

- 资料页：头像占位、姓名、邮箱、手机、职务等可维护字段。
- 账号与安全：修改密码，校验原密码、新密码强度和确认密码。
- 偏好：语言、时区等账号级偏好；主题仍由现有 Appearance Store 管理，不复制服务端状态。
- 登录设备：列出 Mock 会话并支持退出其他设备；当前设备不可误退出。

### 4.7 Roles 与 Menus 迁移后的页面入口

- `index.tsx` 仅做页面骨架、tab 或主从场景分发，不直接 `useQuery` / `useMutation`。
- 列表、详情、表单和日志分别进入相应场景目录。
- 角色和菜单 API 类型只从各自 `api/schema.ts` 推导，删除横切 `admin/api` 中的重复类型。
- 两包各自拥有 `keys.ts` 和 mock db；跨组件同步只通过 Query invalidation。
- Route 改为只 import `@/modules/admin/roles` 或 `@/modules/admin/menus`。

## 5. 数据与契约

每个纵切包必须提供：

- Zod response、request 和 form schema。
- `z.infer` DTO，禁止重复 interface。
- 唯一 query key factory。
- queryOptions 与 mutation hooks。
- 使用 `defineApiContract` 的运行时契约。
- 随业务包放置的 Mock db 和 handlers。
- mutation 成功后的精确失效范围；关联数据额外失效。

Mock 数据是可变的会话内数据源。测试之间必须重置，浏览器刷新是否保留数据不作为持久化承诺。

## 6. 权限与导航

- 新路由 `staticData.permission` 和 `staticData.actions` 是页面及按钮权限的声明源。
- Manifest 增加安全审计、文件中心、系统设置的目录和页面菜单种子。
- 消息中心、个人中心通过 Shell 入口直达；权限仍由 Route 守卫处理。
- NotificationBell 从消息 query 读取未读数，移除固定 `SHELL_NOTIFICATION_UNREAD` 和开发态 toast。
- UserMenu 的个人中心、账号设置、修改密码改为真实导航；帮助、切换账号等未在本阶段定义的能力继续明确标为 stub，不伪装完成。
- 前端权限只控制体验，文档继续说明真实安全边界属于后端。

## 7. UI、主题与复用

- 页面视觉以现有 Users、Roles、Menus 为工程化基准，以 HTML 原型为页面内容和布局参考。
- 业务层只写布局类；颜色、圆角、hover、focus、selected、open 等状态落到 UI/Pro。
- 表格唯一使用 `DataTable`，不新增 TableShell 页面。
- 主从页复用 `SideList`；详情字段复用 `DescriptionList`；表单复用 `FormDialog`；确认操作复用 `ConfirmDialog`。
- 新模式不足三次不抽象。文件选择是跨业务可复用的浏览器原语，允许新增 `FileDropzone` Pro 组件，并同步 `/dev/theme-states` 状态矩阵与主题守卫。
- 所有新增文案同时提供 `zh-CN` 与 `en-US`，不在组件中硬编码中文。
- 支持四套 flavor、light/dark、90%/100%/108% 显示比例、reduced-motion 和键盘操作。

## 8. 错误、空态与并发

- Query 失败使用 ErrorScreen 或场景内错误块，并提供真实 retry。
- Mutation 按钮显示 pending，防止重复提交。
- 删除、启停、已读等乐观更新必须具备失败回滚；不值得乐观更新的表单保存采用成功后 invalidate。
- 详情目标只存 id；资源被其他操作删除后关闭详情并提示。
- 分页删除最后一行时纠正页码，沿用 Users/DataTable 的既有规则。
- API 业务错误使用统一 BizError 文案，不在页面吞错。

## 9. TDD 与迁移策略

执行顺序固定为 RED → GREEN → REFACTOR：

1. 先扩展 module boundary guard，要求 Roles、Menus 和所有新增业务走纵切路径，并验证旧结构仍使测试失败。
2. 迁移 Roles，逐个恢复现有 API、Mock、页面和集成测试。
3. 迁移 Menus，逐个恢复现有 API、Mock、页面和集成测试。
4. 每个新业务先写 schema/model/handler 测试，再写场景行为测试，确认失败原因是能力缺失后才实现。
5. Shell 集成先写 NotificationBell、UserMenu、菜单种子和路由守卫测试。
6. 新 Pro 组件先写组件行为与主题状态测试，并同步 theme-states 矩阵。

任何测试如果第一次运行即通过，必须检查是否断言了现有行为或断言过弱，不能把它记为 RED 证据。

## 10. 验收标准

### 10.1 功能

- Admin 表中的每一项 Mock 闭环都能在浏览器重复操作并回读结果。
- 刷新、后退、前进保持 URL 筛选协议正确。
- Shell 未读数、个人中心入口和权限菜单与页面数据一致。
- Roles、Menus 不再依赖 `modules/admin/pages`、横切 role/menu API 或 handler。

### 10.2 工程门禁

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

生产包扫描必须无命中；ESLint 不新增 warning，现有 TanStack Table incompatible-library warning 单独记录，不能被新增 warning 淹没。

### 10.3 视觉

- 使用 Agent Browser 对原型和实现分别截图，截图前断言路由、页面标题、主题、布局和显示比例。
- Admin 新页面至少覆盖默认中文浅色基线。
- 四套 flavor × light/dark × 90%/100%/108% 使用视觉矩阵检查无水平溢出、浮层错位和不可读状态。
- 每个页面保留 baseline、implementation、diff 和人工结论；不以单一 diff 百分比代替功能判断。

## 11. 明确不做

- 本阶段不接真实后端、对象存储、邮件、PDF 渲染或病毒扫描服务。
- 不实现 HTML 原型中的 Lastmile 页面，直到 Admin 完整验收。
- 不把 Mock 能力描述成生产级安全或持久化能力。
- 不为新页面重写基础 UI，不引入第二套表格、表单或主题系统。
- 不顺带重构与本目标无关的现有模块。

## 12. 完成定义

只有同时满足以下条件，Admin 阶段才算完成：

1. Roles 与 Menus 纵切迁移完成且行为不退化。
2. 所有 Admin 剩余页及注册、找回密码在 Mock 环境可用。
3. Shell、权限、菜单、i18n、Query 缓存和 Mock 聚合全部接通。
4. 自动化门禁、生产构建、Mock 剥离扫描与浏览器视觉矩阵全部通过。
5. 当前工作区既有改动未被覆盖，任务自身提交边界可回滚。

完成 Admin 后才进入 Lastmile，完整 Goal 保持不变。
