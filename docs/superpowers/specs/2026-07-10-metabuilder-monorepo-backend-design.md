# MetaBuilder 全栈脚手架：后端抽离与 monorepo 重组设计

> 日期：2026-07-11（v4）
>
> 修订记录：v1 初稿 → v2/v3 三轮对抗审查 → **v4 修复会话授权、数据权限并集、schema 所有权、权限种子、传输类型与分期依赖等实施阻断**
>
> 状态：**实施基线；可进入 writing-plans 与 TDD**
>
> 来源：从 meta-build（`/Users/ocean/Studio/01-workshop/02-软件开发/06-meta-build/server`）精选移植，适配本前端脚手架

## 1. 目标、约束与事实基线

目标不是把旧后端原样搬过来，而是在当前前端仓库内建立 `frontend/ + backend/` 的全栈范本：所有现有前端功能都能关闭 MSW 后使用真实后端；UI、API、权限、工程结构和派生项目流程都受自动化守卫约束。

已核验且必须修复的旧实现问题：

1. `PermissionOperationCustomizer` 只把权限码拼进 description，没有机器可读 `x-permissions`。
2. `DataScopeExecuteListener` 在上下文缺失、异常和未注册表场景 fail-open，且仍按 `Long` 注入字段。
3. `AuthService.refresh()` 实际是 **refresh token 轮换**，不是管理员为目标用户刷新 authorization；不得复用或改名冒充。
4. `SaTokenAuthFacade.doLogin()` 逐字段写 account-session；一次请求可能读到混合版本授权快照，不能作为新方案。
5. 旧 codegen 用 `(mb_|biz_).*` 生成到同一 `com.metabuild.schema`，业务模块能绕过 `admin.api` 直接访问平台表。
6. 旧 `DataScopeType` 通过单值优先级选一个 scope，不能表达多角色 `SELF ∪ DEPT ∪ CUSTOM` 并集。
7. 当前前端 `staticData` 有 53 个权限码，`menuSeed` 有 41 个，存在 12 个 route-only 码；两套声明不能继续并存。
8. 旧后端 204/空 200、文件流、multipart 与当前 `client.ts` 的固定 JSON 解析不兼容；下载还绕过认证、locale、refresh、timeout 与 abort。

除非本文件显式写为“参考移植”，不得把旧仓“已有类/已有原语”当成可直接复用的事实；实施计划必须再次打开对应源码确认签名和行为。

## 2. 已定决策

| 决策项 | 结论 |
|---|---|
| 产品形态 | 配套后端范本；前端 zod、页面语义和交互规则是功能契约甲方，wire contract 由双方契约测试共同约束 |
| 仓库 | 当前仓原地重组为 `frontend/ + backend/`，保留前端 git 历史 |
| 命名空间 | 系统名 MetaBuilder；Maven groupId 与 Java package 继续使用 `com.metabuild`，artifactId 使用 `metabuilder-*`；禁止另起 `com.metabuilder` 第二命名空间 |
| 传输 | HTTP 语义 + RFC 9457 ProblemDetail + 成功对象直出；分页固定 `{list,total}`；不保留内部 adapter 方言 |
| API 路径 | `/api/*`，不加版本前缀；破坏性变更由 OpenAPI snapshot + oasdiff 拦截 |
| 认证 | Sa-Token 只承担不透明 access token/account-session；refresh token 自建轮换，不使用 sa-token-jwt |
| 授权 | 独立、不可变、单 key 原子 `AuthorizationSnapshot`；不在 SaSession 逐字段存 permissions/dataScope |
| 权限变更 | 新建 `AuthorizationRefreshService` 面向目标 userIds；变更前设拒绝栅栏，提交后批量重算，失败保持 fail-closed |
| ID | 所有持久化 ID 使用 UUIDv7，PostgreSQL `uuid`；不得导入旧 Long 域后再全仓手术 |
| 数据权限 | 五型角色配置编译为可并集的 `DataScopePolicy`；启动期注册完备性 fail-closed，热路径不抛配置异常 |
| 权限码 | 前端 route `staticData` 是唯一声明源；TypeScript AST 生成 catalog/seed；后端 `x-permissions` 只做消费差集校验 |
| schema | 平台与 lastmile 物理拆分 Maven artifact、migration 路径和 generated package；禁止全域聚合 schema |
| 模块 | admin 实现保持一个 Maven 编译单元，另设窄 `admin-api` 契约 jar；lastmile 只能依赖 `admin-api` |
| Origin | dev 由 Vite `/api` proxy 同源；prod 同域反代；CORS 默认空，仅真实跨域部署开启 |
| 租户 | 单租户，不预留 `tenant_id`；未来升级以一次完整 ADR/迁移实现 |
| demo | demo 恒走 mock；真后端只 seed 引导数据，不装丰富演示数据 |
| 文档 | 顶层 `CLAUDE.md` 单一手写真源；`AGENTS.md` 生成或软链；约束优先固化为测试 |

保留原裁定：不换 Spring Security（ADR-0005 与认证门面仍成立）；不由 OpenAPI 生成 TS+Zod（zod 继续承载页面和表单语义）。本轮没有新证据推翻这两项。

## 3. 总体形态与所有权

```text
MetaBuilder/
├── frontend/                         # 当前前端整体迁入
├── backend/
│   ├── app/                          # Boot 入口、装配、跨模块集成测试
│   ├── shared-kernel/                # 纯 Java 值对象、错误、分页、门面接口
│   ├── admin-api/                    # 面向其他子系统的窄应用端口；无 Spring/jOOQ/Sa-Token
│   ├── schema-platform/              # mb_* migration + com.metabuild.schema.platform
│   ├── schema-lastmile/              # biz_* migration + com.metabuild.schema.lastmile
│   ├── infrastructure/               # security/jooq/cache/web/i18n/observability + 技术网关
│   ├── modules/
│   │   ├── admin/                    # auth/users/depts/roles/menus/files/messages/... 包级纵切
│   │   └── lastmile/                 # shipments/customers/channels/... 业务样板
│   └── api-contract/                 # OpenAPI 基线、oasdiff、契约 fixtures
├── docs/
├── scripts/
└── CLAUDE.md
```

### 3.1 “前后端镜像”的准确含义

镜像只承诺 **子系统和业务域所有权一致**，不承诺技术 artifact 对称：

- `frontend/modules/admin/users` 对应 `backend/modules/admin/...users`；lastmile 同理。
- 前端 zod schema 属于业务包；后端数据库 generated schema 属于表 owner 的独立 artifact。两者不是同一层，也不得用“镜像”要求共享或互相生成。
- 前后端共享的是 HTTP 契约测试，不共享源代码 schema。

### 3.2 表所有权与依赖方向

| 所有者 | 表/生成包 | 可写者 | 其他子系统访问方式 |
|---|---|---|---|
| admin | `mb_*` / `schema.platform` | `modules/admin` | 只经 `admin-api` |
| lastmile | `biz_*` / `schema.lastmile` | `modules/lastmile` | admin 不反向依赖；需要聚合时由 app use case 调用端口 |
| infrastructure | `flyway_platform_history`、`flyway_lastmile_history`、`shedlock` 等技术表 | 对应 adapter | 不作为业务 repository 数据源 |

硬约束：

1. `lastmile` 依赖 `admin-api + schema-lastmile + shared-kernel`，不得依赖 `modules/admin`、`schema-platform` 或其 generated package。
2. `admin` 依赖 `admin-api + schema-platform + infrastructure + shared-kernel`，不得依赖 lastmile。
3. Flyway 由两个显式 bean 顺序执行：platform 使用 `flyway_platform_history`，lastmile 在其后使用 `flyway_lastmile_history`；两边 migration version 可独立递增且不得共享默认 `flyway_schema_history`。jOOQ codegen include 和 generated package 也按 owner 分开；禁止重新出现 `(mb_|biz_).*` 聚合生成。
4. 跨域写操作禁止。跨域读取优先窄批量端口，不开放 repository 或 `Tables.*`。

### 3.3 端口不是“上帝 API”

`admin-api` 按业务能力拆接口，并固定批量/缺失语义（单批最多 500，空输入返回空结果，部分缺失不整批抛 404）：

```java
record BatchResult<K, V>(Map<K, V> found, Set<K> missing) {}

interface UserDirectoryApi {
    BatchResult<UUID, UserSummary> batchGetUsers(Set<UUID> userIds);
}

interface DepartmentDirectoryApi {
    BatchResult<UUID, DepartmentSummary> batchGetDepartments(Set<UUID> deptIds);
    Set<UUID> expandSubtree(Set<UUID> rootDeptIds);
}

interface AttachmentApi {
    UploadTicket issueUploadTicket(UploadPolicy policy, UUID actorId, String purpose);
}

interface FileCatalogApi {
    BatchResult<UUID, FileMetadata> batchGetMetadata(Set<UUID> fileIds);
    DownloadTicket issueDownloadTicket(UUID fileId, UUID actorId, String purpose);
}

interface InboxPublisher {
    PublishResult publish(Collection<InboxMessageCommand> messages);
}
```

`UserSummary/DepartmentSummary/FileMetadata` 只含跨域稳定摘要，不复用页面 CRUD DTO；ticket 短时、单文件、单 actor、单操作、可审计，download ticket 一次性消费。附件关系（如 `shipment_id ↔ file_id`）由 lastmile 自己的表持有；lastmile 先完成自身 permission/dataScope 校验，再请求 capability ticket。admin 不保存万能 `ownerType/ownerId`，也不回调 lastmile 判 ACL。`InboxMessageCommand` 必须带 idempotencyKey，业务事务提交后再 publish。

技术 SPI 只保留低层能力：`BlobStore`、`MailGateway`、`SmsGateway`。文件校验、元数据、配额属于 admin application；站内信编排属于 admin messages。lastmile 不直接调用 `BlobStore` 或数据库表完成业务附件/通知。

### 3.4 admin 单模块的成本边界

当前规模接受一个 admin Maven 模块，换取较低装配成本；ArchUnit 负责包级纵切，CI 不允许跳过架构测试。满足任一条件时必须写拆分 ADR，而不是继续堆：

- admin 生产 Java 文件超过 250；
- 单模块增量 `mvn test` P95 超过 90 秒；
- 3 个以上团队需要独立发布节奏。

Sa-Token 依赖必须留在 security adapter 的薄 jar/非传递边界，业务包只能见 `AuthFacade`/`CurrentUser`。基础设施子包拓扑和 admin 域间 `api` 依赖均由 ArchUnit 检查。

### 3.5 核心与示例

- 核心、可回流：app、shared-kernel、admin-api、schema-platform、infrastructure、modules/admin。
- 示例、可整包替换：前后端 `modules/lastmile` **连同 `schema-lastmile` migrations/generated artifact**；只替换 Java 包却保留业务 schema 不算整包替换。
- `docs/architecture.md` 与 `docs/NEW-PROJECT.md` 必须同步核心/示例资产矩阵，不能继续把 admin users/roles/menus/dashboard 写成可删除示例。

## 4. 统一传输方言

### 4.1 成功与错误响应

| 场景 | HTTP/Content-Type | 前端解析 |
|---|---|---|
| JSON 对象/数组 | `2xx application/json` | `responseKind: "json"` 后走 zod contract |
| 分页 | `2xx application/json`，`{list,total}` | zod page contract |
| 无响应体 | `204`；兼容旧空 `200` | `responseKind: "void"`，绝不调用 `json()` |
| 文件/CSV | `2xx` + 具体媒体类型 | `responseKind: "blob"`，保留 filename/content-type |
| 错误 | `4xx/5xx application/problem+json` | 转为 `BizError` |
| multipart 上传 | 请求体例外，不改变响应模型 | 由 body encoder 生成 FormData，禁止强制 JSON header |

`ProblemDetail` 扩展固定为：

```json
{
  "type": "about:blank",
  "title": "Forbidden",
  "status": 403,
  "detail": "无权执行此操作",
  "instance": "/api/users/1",
  "code": "auth.permission.denied",
  "traceId": "..."
}
```

`code` 只允许稳定点分字符串；旧四位数字业务码不得进入新契约。

### 4.2 前端 request core

所有 `json/void/blob` 和 multipart 必须共用一个 `requestCore`：token、`Accept-Language`、refresh single-flight、ProblemDetail、timeout、AbortSignal、traceId 和凭证策略都只能实现一次。文件下载禁止裸 `fetch`。

`BizError` 至少包含 `status/code/detail/traceId/instance/retryAfter`。只有“原请求携带 access token + endpoint 不是 login/refresh + ProblemDetail code 在 token-expired allow-list”时才允许一次 refresh 重放；坏密码、账号禁用、refresh endpoint 自身 401 和普通 401 直接返回。mutation 的这一次仅是 controller 前认证失败后的 auth replay，不等同于网络自动重试。403 和普通 4xx 不重试。只有幂等 GET/HEAD 可对网络错误、408、429、502、503、504 做有上限重试，429 尊重 `Retry-After`；mutation 默认零自动重试。

非 2xx 先按 Content-Type 与 schema 嗅探：合法 ProblemDetail 转 `BizError`；HTML/text/plain/空 body/畸形 problem 合成 `transport.http-error`，保留 status、响应 trace header 与截断后的安全 body 摘要。blob 请求也必须先走此分支，不能把错误页保存成文件。

### 4.3 后端异常映射

`GlobalExceptionHandler` 必须分别映射并测试：参数校验、JSON 语法错误、query/path 类型错误、缺参数、缺 multipart part、上传过大、405、415、认证失败、权限失败、限流、领域冲突和未知 500。禁止把这些客户端错误落入 catch-all 500。

### 4.4 mock 迁移

- `ok(data)` 只直出成功对象；`noContent()` 返回 204。
- `biz()` 改为结构化输入 `{status,code,detail,extensions?}`，不再从同一个四位数字猜 HTTP status/领域语义。
- 113 个调用点逐个迁移；32 个依赖旧 envelope 的测试同步改为真实 HTTP 行为断言。
- demo/build mock 与真实后端说同一方言；是否 mock 只改变数据来源，不改变 contract。

## 5. 认证、account-session 与授权快照

### 5.1 两种 refresh 必须分名

- `RefreshTokenService.rotate(refreshToken)`：客户端 token 轮换，沿用旧 `AuthService.refresh()` 的职责但重新命名。
- `AuthorizationRefreshService.refreshUsers(Set<UUID> userIds, Cause cause)`：管理员变更后的目标用户授权重算。

两者没有复用关系。`AuthFacade` 只提供当前请求认证门面；另设面向目标用户的 `SessionControl`/`AuthorizationSnapshotStore`，严禁通过临时登录、伪造当前用户或签发新 token 来刷新别人。

### 5.2 原子快照

```java
public sealed interface AuthorizationState
    permits AuthorizationSnapshot, AuthorizationFence {}

public record AuthorizationSnapshot(
    UUID userId,
    long revision,
    boolean systemAdmin,
    Set<String> roles,
    Set<String> permissions,
    DataScopePolicy dataScope,
    Instant calculatedAt
) implements AuthorizationState {}

public record AuthorizationFence(
    UUID userId,
    long targetRevision,
    UUID operationId,
    Instant fencedAt
) implements AuthorizationState {}
```

Redis 每用户一个 `authz:{userId}` key，值为 `AuthorizationSnapshot`（READY）或 `AuthorizationFence`（FENCED）；整 key 原子替换，不逐字段 `session.set`。一次请求只读一次 state 并把 READY snapshot 放 request scope；禁止本地缓存和旧 session 字段 fallback。key 缺失、解析失败、FENCED 或 Redis 不可用时返回 503 `auth.authorization-unavailable`，不能按无权限 403 或放行处理。

Sa-Token account-session 仍按用户共享，因此一个快照覆盖该用户所有设备和所有应用实例；账号禁用、安全事件才 `kickout`。

### 5.3 变更协议与事务边界

授权相关写操作使用以下协议：

1. **同一数据库事务内**先取得全局 `AUTHZ_GRAPH` PostgreSQL advisory transaction lock，再查询受影响 userIds/preimage；所有授权图写操作用同一把锁串行化，避免“取完 preimage 后又新增成员”的漏刷新竞态。删除角色/关系前必须固化 preimage。
2. 仍在该事务内，用 Lua 对每个用户原子写 `AuthorizationFence(targetRevision, operationId)` 并登记到按 `fencedAt` 排序的 `authz:fenced` 集合，再用 pipeline 检查全部 reply；若有部分失败则按旧 DB 状态重建已设栅栏并回滚事务。全部成功后再完成业务变更、为每个用户递增 `authz_revision`、写带同一 operationId 的 `mb_authz_refresh_outbox`。关系变更采用幂等 PUT/DELETE 语义。
3. **提交后、响应前**按 userId 批量查询角色/权限/部门，一次编译一批快照，用 Lua compare-and-set（同时匹配 operationId 且新 revision 不低于 targetRevision）写回 `READY` 并从 `authz:fenced` 移除；禁止每设备、每角色 N+1 重算。登录初始化也只能用 revision CAS，不能覆盖更高 revision 的 FENCED。
4. 回滚时只允许相同 operationId 的补偿解除自己的栅栏；提交后刷新失败时保持 `FENCED`，返回 `503 auth.refresh.pending`（detail 明示“变更已提交、用户临时拒绝访问”），outbox worker/reconciler 继续恢复。客户端不得自动重放 mutation。
5. 后台 reconciler 从 outbox 与 `authz:fenced` 有界索引取任务，并先取得同一 `AUTHZ_GRAPH` lock。若对应 operationId 的 outbox 存在或 DB revision ≥ targetRevision，则正常前滚；若 outbox 不存在且 DB revision < targetRevision，说明进程在 DB commit 前崩溃，允许**仅匹配同一 operationId**的补偿以当前 DB revision 重建 READY。除此唯一回滚分支外，低 revision 永远不得覆盖高 revision。禁止用 Redis 全量 `KEYS`/无界 SCAN 当任务队列。

这套协议选择短暂拒绝访问而不是短暂保留已撤销权限。100 个受影响用户的基准上限：影响集合 1 次查询、授权图不超过 3 次批量查询、2 次 Redis pipeline，不得出现按 session/device 循环；P2 用 Testcontainers 做查询计数和耗时基线。

必须触发重算的事件：角色权限/数据范围/启停/删除，用户角色变化，用户部门变化，部门移动/删除（影响 subtree scope），自定义部门关系变化，权限 catalog deprecate，超级管理员状态变化。部门树变更的受影响用户必须由反向查询计算，不能只刷新执行管理员。

用户禁用/删除是 terminal 变更，不走普通 READY 重建：同样先取得 `AUTHZ_GRAPH` lock 并 FENCE，再软删除/改状态和写 terminal outbox；提交后执行 `kickoutAll + revokeAllRefreshTokens(userId) + delete authz key`，全部成功才清 fence 任务。refresh token store 必须维护 userId→tokenIds 反向索引，保证一次撤销全设备 refresh token。任一步失败保持 FENCED 并由 reconciler 重试；重新启用必须递增 revision、重新编译 READY，旧 token 不能复活。用户记录为审计和 revision 保留，不做物理硬删除。

## 6. 数据权限

角色继续配置五型 `ALL/SELF/OWN_DEPT/OWN_DEPT_AND_BELOW/CUSTOM_DEPT`，但运行态不保存单个 enum：

```java
public record DataScopePolicy(
    boolean all,
    boolean includeSelf,
    Set<UUID> deptIds
) {}
```

编译规则：

1. 只取启用角色；`ALL` 直接短路为 all。
2. `SELF` 令 `includeSelf=true`；超级管理员由显式系统角色编译为 all，不依赖字符串通配。
3. `OWN_DEPT` 加当前部门；`OWN_DEPT_AND_BELOW` 加展开后的子树；`CUSTOM_DEPT` 加有效自定义部门。
4. 多角色结果做 OR 并集；没有任何有效范围得到 deny-all，而不是 all。
5. 删除/禁用角色不参与编译；外键 cascade/清理任务消除悬空 custom relation。

Listener 对注册表内每张表按 `(deptIds 非空 ? owner_dept_id IN deptIds : false) OR (includeSelf ? created_by = userId : false)` 注入；`all` 不加条件，空 policy 注入 false condition。禁止在 `includeSelf=false` 时无条件拼接 creator 条件。字段统一 UUID。

安全闭环：

- 启动前 Spring bean 枚举两个 generated schema 的业务表，要求每表属于 `DataScopeRegistry` 或显式 whitelist；缺项启动失败。该检查不是 ArchUnit。
- 同时验证 registry 的 dept/creator 列存在且类型为 UUID；热路径不再抛配置错误。
- 未认证登录链路可放行；已认证但上下文异常必须 metrics + fail-closed。
- `@BypassDataScope` 不跨异步线程传播；需要 bypass 的异步任务必须显式 system principal 并有审计。
- 集成测试覆盖别名、JOIN、CTE、子查询；v1 若只保证顶层 FROM，repository 守卫必须禁止可绕过写法。

前端 P2 删除“角色 × 资源 scope 矩阵”，只编辑角色级五型；未来资源差异策略应挂资源注册侧，升级依据见附件。

## 7. 权限码、菜单与 seed 生命周期

### 7.1 唯一声明源与 AST 管线

route `staticData.permission/actions` 是唯一权限声明源。权限码沿用当前 `<namespace>:<resource>:<action>` colon grammar（如 `iam:user:view`）；点分 grammar 只属于 ProblemDetail error code，二者不得互换。page permission 的稳定 sourceKey 为 `routeId#page`；每个 action 新增与 code 解耦的稳定 `key`，sourceKey 为 `routeId#action:<key>`，改 code/label/排序都不得改 key。

实现 `frontend/scripts/permissions/extract.ts`，用 TypeScript compiler API 读取 `.tsx` AST；只接受对象/数组/string literal 与受控常量引用，动态表达式、缺 action key 或重复 sourceKey 直接 CI 失败。禁止 regex、构建时执行 route、`eval`。

确定性产物（排序稳定并入 git）：

- `backend/api-contract/src/main/resources/permissions/permission-catalog.json`
- `backend/api-contract/src/main/resources/permissions/menu-seed.json`

`generate` 直接更新上述 backend classpath resources；`check` 生成到临时目录并逐字节比较，CI 要求无 drift。`menuSeed` 只负责 catalog 默认层级、label/icon/sort/visible：

- display-only 目录可无 route、path 和 permission；
- 可导航菜单必须引用现有 route key，path/type/permission 来自 catalog；
- “页面没写但先配可导航菜单”不允许，避免产生无契约入口。

后端注解导出：

```json
"x-permissions": { "logic": "AND", "codes": ["iam:user:view"] }
```

必须保留 `AND/OR` 逻辑，CI 校验 `backend consumed ⊆ catalog declared`；不得把多码压成无逻辑 string list。

### 7.2 持久化模型

- `mb_permission(id, source_key, code UNIQUE, kind, status, first_seen_version, last_seen_version)`
- `mb_menu(id, source_key UNIQUE NULLABLE, origin, route_key, permission_id, default_parent_source_key, default_label_key, default_icon, default_sort, default_visible, status)`
- `mb_menu_customization(menu_id, parent_overridden, parent_id, label_key, icon, sort, visible)`
- `mb_role_permission(role_id, permission_id)`

权限独立于菜单。菜单 `visible/status` 只控制导航，不撤销 API 权限；真正授权只取启用角色与 `ACTIVE` permission 的 `mb_role_permission`。catalog synchronizer 只写 `default_*` 和 code-owned 字段，管理员只写 `mb_menu_customization`，effective value 为 override（存在时）否则 default。runtime 可创建 `origin=RUNTIME`、无 route/permission/sourceKey 的 display-only 目录；可导航节点的 route key、path、type、permission code 永远只读并来自 catalog。后端拒绝 catalog 外 code，不能让 CRUD 建立第二真相源。

`PermissionCatalogSynchronizer` 在 Flyway 后、开放流量前从 `api-contract` classpath 读取 version+SHA256，取得 `CATALOG_SEED` 与 `AUTHZ_GRAPH` lock，在一笔事务内按稳定 `sourceKey/code` upsert 默认值并记录版本。已有 code 保留 UUID、customization 与角色授权；消失项标 `DEPRECATED`，不参与新授权和快照，但保留审计关系；rename 必须提供 sourceKey 对应的显式 alias migration，禁止删除再新建。deprecate/rename 若影响在线用户，必须复用 §5 FENCE/outbox 协议，不能在启动期静默改 READY snapshot。同步失败阻止应用 ready。

每版验证 synchronizer 幂等，且 fresh DB 与逐版升级 DB 的**有效 catalog/default menu 结构**一致；operator customization 不参与此等价比较，也不会被 seed 覆盖。

P1 的最小手写 bootstrap seed 必须使用与最终 catalog 相同的 `source_key/code`；P2 生成器接管后执行升级测试，证明行 ID 与已有 role grants 不变。

## 8. 域实现与移植边界

精选移植：Spring Boot/Java 21/Maven 基线、Flyway+jOOQ 流水线、ProblemDetail/i18n/trace、CurrentUser/AuthFacade 门面思想、缓存纪律、操作审计、ShedLock、Testcontainers、OpenAPI snapshot、enforcer/flatten、类型化配置与结构化日志。所有移植代码先适配本文件，再进入新仓；不复制旧 29 模块 DAG。

admin 域目标：

| 域 | 必须交付 |
|---|---|
| auth | password/sms/qr 登录、access+refresh rotation、logout、`/me`、爆破延迟/锁定；图形 captcha 不搬 |
| menus/subsystems | 前端扁平 MenuRecord/Subsystem 契约、真实导航、catalog 只读字段 |
| users/depts/roles | 高级筛选、批量禁用、部门防环与成员数、系统角色保护、功能权限与角色级数据范围、授权刷新 |
| files | 文件夹、配额、multipart、ext+MIME+size 校验、SHA256 路径、admin AttachmentApi；local BlobStore，S3 留 pre-prod |
| messages | 站内信、未读数、审批收件箱与仅 pending 可审状态机、InboxPublisher |
| dictionaries/company/profile | 按现有 zod 契约；profile 含偏好、安全设置、设备 |
| audit | 操作/登录日志、CSV blob 下载；切面在 infrastructure |
| dashboard | app use case 聚合真实计数；现有 mock todo 要么立域，要么从真实版删除 |
| mail/sms | 极简纯文本 SMTP 与 SMS gateway；register/forgot-password/SMS 登录所需，外部服务以 contract test/stub 隔离 |

lastmile 前后端必须成对实现 shipments/customers/channels/carriers/suppliers/billing，并只通过 admin-api 取用户、部门、附件、通知能力。

不搬：旧 SSE、公众号/小程序、Thymeleaf 模板体系、图形 captcha、monitor、exam/notice 成品模块、Spec/AI 循环引擎、旧 specs/handoff、生产 Dockerfile。SSE/WebSocket、多租户、SSO/LDAP/OIDC、2FA、微服务、OPA/Casbin 与生产编排是非目标。

## 9. 工程守卫与验收矩阵

### 9.1 结构守卫

- Maven dependency/ArchUnit：模块方向、admin 包纵切、lastmile 禁平台 schema、security 依赖隔离、infra slice allow-list。
- Namespace guard：生产/测试源码、POM groupId 与 generated package 统一 `com.metabuild`，`com.metabuilder` 零命中。
- jOOQ/Flyway：两个 owner 独立生成；生成物入 git；migration/codegen drift CI。
- 前端保持现有 route/modules/pro/ui、zod contract、query key、theme/design guard；迁目录后所有脚本从 `frontend/` 可运行。
- `.env.example` 只含非敏感占位；dev 一键脚本启动 PostgreSQL、Redis、backend、frontend；不提交 token/password。

### 9.2 必须用真实依赖的安全测试

认证/授权集成测试使用真实 Redis + Sa-Token + PostgreSQL Testcontainers，禁止 no-op `AuthFacade` 作为唯一证据。覆盖：

- access/refresh rotation、重放、并发 single-flight、logout，以及 disable/delete 的 fence→kickoutAll→全 refresh token 撤销；
- 五种 scope、所有多角色并集、无角色 deny-all、disabled/deleted role、custom stale relation；
- role delete 的 preimage、部门移动、用户换部门、事务回滚、Redis 写失败、outbox 恢复；
- fence 成功后、DB commit 前进程崩溃时，reconciler 能识别 abandoned operation 并按旧 revision 解栅栏；
- kickout/revoke 任一步失败时 terminal fence 保持，恢复后旧 access/refresh token 都不能复活；
- 两应用实例读同 revision、低 revision 不覆盖高 revision；
- 100 用户角色变更的查询/Redis 操作上限；
- 新表未 register/whitelist 时应用拒绝启动。

### 9.3 每个前端能力的完成定义

一个页面/动作只有同时满足以下条件才可从 mock 清单划掉：

1. zod contract 与真实 backend JSON/void/blob 响应通过契约测试；
2. 正常、空状态、校验错误、401、403、领域冲突均有测试；
3. 写操作落真实 PostgreSQL，并由 API 回读；涉及文件同时回读 metadata/blob；
4. 后端权限注解与数据范围有效，前端隐藏只算体验层；
5. TanStack Query 失效、loading/error/toast 和 i18n 正确；
6. 关闭 MSW 后 Browser 完成真实用户路径，且 UI 不因接后端而回退设计系统/响应式/显示比例；
7. 对应 mock handler 删除或仅保留 demo registry，生产构建不含 faker/msw/worker。

最终验收必须同时有 Browser、API、DB、Redis、OpenAPI、build/test 证据；“页面能打开”或“单测通过”不算打通。

## 10. 分期路线与依赖

现工作树有用户正在进行的前端 UI 改动。**它只阻塞大规模 `git mv frontend/`，不阻塞新增 backend 与契约文档**；实施不得覆盖或夹带这些改动。

| 阶段 | 内容 | 可验证 DoD |
|---|---|---|
| **P0a 加法式基线** | 在现目录旁新增 backend 多模块骨架、schema 物理拆分、契约 ADR、dev compose/proxy 设计、结构守卫；前端暂留根目录 | `mvn verify` 真实执行；模块负依赖测试红→绿；Testcontainers 分别验证 platform-only fresh DB、platform→lastmile fresh DB、重复 validate 与同 owner 重复 version 负例；移除 lastmile 的测试 profile 不影响 admin/platform；无触碰现有脏 UI 文件 |
| **P0b monorepo 归位** | 用户前端改动落地后 `git mv` 到 frontend，重写 CI/脚本/文档路径、顶层一键启动 | 前端全门禁 + backend verify 全绿；`scripts/dev.sh` 一键起；git 只含可解释改动 |
| **P0.5 UUID 基础（gated）** | 新 migration 从第一天 UUIDv7；只移植并改造 shared/security/DataScope 基础类，禁旧 Long domain 进入；编号另做小设计 | AST/ArchUnit 证明持久化 ID、API/path ID、`CurrentUser.userId` 与 jOOQ ID 字段不使用 Long，系统 principal 不使用 `0L`；不全仓禁合法 long 零值；UUID 顺序与序列化测试绿；对抗复审通过 |
| **P1 认证 + Shell** | 引入最小 IAM **读模型**（user/role/dept/permission/menu）、真实 Redis/Sa-Token、token rotation、`AuthorizationSnapshot`/store/compiler 的登录初始化与 request-scope 读取、`/me`、menus/subsystems；完成 requestCore 与全部 mock 方言迁移；最小稳定 bootstrap seed | 关闭 mock 后从真实 DB 登录、写原子授权快照、刷新、进入 Shell、渲染导航；void/blob/problem 路径测试绿；错误 toast 有 traceId；SaSession 无授权字段 |
| **P2 IAM + 权限闭环** | users/depts/roles CRUD、独立 permission 表、AST catalog/seed、`x-permissions`、`AuthorizationRefreshService` + FENCED/CAS/outbox/reconciler、DataScopePolicy 与启动校验、前端角色级 scope UI | IAM 三页 Browser/API/DB/Redis 闭环；五型+并集+并发矩阵绿；权限变更后所有设备下一请求得到新快照或 fail-closed；seed fresh/upgrade/idempotent 绿 |
| **P3 admin 长尾** | messages/files/dictionaries/audit/profile/company/dashboard/mail/sms；逐页关闭真实模式 mock | 现有 admin 页面和动作全部满足 §9.3；文件/CSV/审批状态机有反向用例 |
| **P4 lastmile 样板** | 前后端成对实现 lastmile，独立 schema，重写新增/删除子系统清单 | 所有 lastmile 页面关 mock；ArchUnit 证明无平台表直连；从零新增一个小域全流程走通 |
| **P5 全栈收口** | 清除真实模式 mock fallback、全量契约/性能/安全/视觉回归、NEW-PROJECT 派生演练 | 全门禁绿；生产前端 bundle 无 mock；新 clone 按文档 30 分钟内启动；最终对抗审查无 🔴/🟡 |

P1 必须包含 IAM 读切片，否则 auth/menu 没有物理数据源；P2 才开放 IAM 管理写能力。P0.5 不再承诺改造旧仓 110 个业务文件，因为这些业务域尚未进入新仓；禁止先搬 Long 模型再做全仓手术。

## 11. 计划期不得自由发挥的接口

实施计划必须逐任务写清：文件、先失败的测试、最小实现、验证命令、依赖阶段和回滚边界。以下名称/模型在新 ADR 前不得改：

- `PageResult<T>(List<T> list, long total)`
- `BizError(status, code, detail, traceId, instance, retryAfter)`
- `ResponseKind = json | void | blob`
- `AuthorizationState` / `AuthorizationSnapshot` / `AuthorizationFence` / `AuthorizationRefreshService.refreshUsers(...)`
- `DataScopePolicy(all, includeSelf, deptIds)`
- `admin-api` 五类窄端口与 `BlobStore/MailGateway/SmsGateway` 技术 SPI
- `mb_permission + mb_menu + mb_role_permission`
- `x-permissions = {logic,codes}`

任何计划若重新写成“复用 `AuthService.refresh()`”“授权字段存 SaSession”“共享全域 schema”“scope 取最高优先级”“runtime 可新增 permission code”，都属于与本 spec 冲突，必须在编码前退回。

## 12. 风险与 pre-prod 登记

- account-session 授权刷新选择 fail-closed 栅栏，会在 Redis/重算故障时临时拒绝用户；这是安全取舍，必须用 outbox/告警降低恢复时间。
- admin 单模块的编译与测试成本已设量化拆分阈值；未达到前不提前微模块化。
- AST extractor、113 个 mock 调用点和 32 个旧 envelope 测试是独立工作量，计划不得塞进一个“改 client”任务。
- pre-prod：S3 adapter、SBOM/漏洞门禁、HSTS、密码历史/过期、审计防篡改、生产 Dockerfile/nginx/优雅停机、备份恢复、容量规划。

## 13. 证据索引

- 前端：`src/lib/http/client.ts`、`src/mocks/http.ts`、`src/config/request.ts`、`src/modules/registry.ts`、`src/routes/_auth/**/*.tsx`。
- meta-build：`AuthService.java:152-199`（token rotation）、`SaTokenAuthFacade.java:34-92`（逐字段 session 写）、`AuthFacade.java:7-35`（仅当前用户门面）、`DataScopeExecuteListener.java:39-59,74+`（fail-open/Long）、`PermissionOperationCustomizer.java:22`（无真扩展）、jOOQ codegen `(mb_|biz_).*` 配置与业务 repository 对 IAM/file generated table 的直接引用。
- 数据权限依据：`2026-07-10-data-permission-research-annex.md`；多角色必须按并集编译，不能用 enum ordinal/优先级选单值。
