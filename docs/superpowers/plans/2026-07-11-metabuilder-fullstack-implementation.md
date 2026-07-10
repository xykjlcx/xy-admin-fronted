# MetaBuilder 全栈后端与真实联调实施计划

关联设计：`docs/superpowers/specs/2026-07-10-metabuilder-monorepo-backend-design.md`（v4）

## Goal

实现配套 Java 后端，把当前 Admin 与 Lastmile 的全部前端能力接到真实 PostgreSQL/Redis/API，并通过架构、权限、数据范围、UI、契约、Browser、DB、Redis、OpenAPI 与生产构建验收。

## 全局约束

- 分支固定为 `codex/metabuilder-fullstack`，不得在 main 直接实现。
- 当前 8 个 UI/菜单脏文件属于用户；P0a 不触碰、不提交，后续只有在其状态被用户收敛后才做 `frontend/` 整体迁移。
- 每个行为变更严格走 RED → GREEN → REFACTOR；实现者报告必须写明失败测试命令、预期失败原因、通过命令和输出摘要。
- 配置/骨架也先写可执行 contract test 或负向 fixture；不以“只是 POM/YAML”为由跳过验证。
- 不从旧仓复制 Long ID、sa-token-jwt、共享全域 schema、SaSession 授权字段或旧 envelope。
- 每个任务独立提交，提交只包含该任务文件；每任务必须经过 spec compliance + code quality 双重 review。
- Java 使用 21；Maven Wrapper 是唯一 CI 入口。本机 JDK 21 未注册进 `/usr/libexec/java_home`，禁止依赖该命令；本仓命令显式设置 `JAVA_HOME=${JAVA_HOME_21:-/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home}` 并先断言 `$JAVA_HOME/bin/java -version` 为 21，CI 使用 Temurin 21。
- API DTO 不复用 jOOQ record；跨域 DTO 不复用页面 CRUD DTO；前端 DTO 只从 zod schema 推导。
- 未达到对应任务 DoD，不删除 mock fallback；真实模式和 demo mock 必须保持同一 wire contract。

## 阶段依赖

```text
P0a(Task 1-6) → P0b(Task 7) → P0.5(Task 8)
                                   ↓
P1(Task 9-13) → P2(Task 14-19) → P3(Task 20-22) → P4(Task 23-24) → P5(Task 25-27)
```

## Task 1：建立 backend Maven reactor 与模块边界

新增：

- `backend/pom.xml`、`.mvn/wrapper/**`、`mvnw`、`mvnw.cmd`
- `backend/{app,shared-kernel,admin-api,schema-platform,schema-lastmile,infrastructure,api-contract}/pom.xml`
- `backend/modules/{admin,lastmile}/pom.xml`
- `backend/scripts/verify-reactor.sh`
- 各模块最小 marker class 与 package-info
- 根 `.gitignore`：忽略 `**/target/`、`.flattened-pom.xml`，显式放行 `!**/.env.example`

RED：

1. 先新增 `verify-reactor.sh`，断言九个模块、Java 21、禁止 `sa-token-jwt`、lastmile POM 禁依赖 `admin`/`schema-platform`，并用 `git check-ignore --no-index` 校验 Maven 产物被忽略而 `backend/.env.example` 可提交。
2. 运行脚本，确认因 `backend/pom.xml`/模块缺失而失败。

GREEN：

1. 建九模块 reactor、统一 dependency/plugin management、enforcer、compiler、Surefire、JaCoCo 与 flatten 基线。
2. `modules/lastmile` 只依赖 `admin-api/shared-kernel/schema-lastmile`；`modules/admin` 不依赖 lastmile。
3. 创建 Maven Wrapper，不引入任何业务代码。

验证：

```bash
bash backend/scripts/verify-reactor.sh
JAVA_HOME=${JAVA_HOME_21:-/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home} backend/mvnw -f backend/pom.xml verify
git status --short
git diff --check
```

## Task 2：固化 shared-kernel 与 typed admin-api

新增：

- `shared-kernel`：`PageResult`、Problem code/exception、UUID 值对象约束、Clock/CurrentUser/AuthFacade 接口
- `admin-api`：`BatchResult`、User/Department summary、Attachment/File capability ticket、Inbox command/result
- 对应单测与 ArchUnit 无框架依赖测试

RED：

- `PageResult` JSON 字段必须恰为 `list/total`。
- BatchResult 对空输入、部分缺失、重复 ID 有确定语义，单批 >500 拒绝。
- `admin-api` 不得依赖 Spring、jOOQ、Sa-Token 或 schema artifact。
- download ticket 绑定 actor/file/operation/expiry 且不可复用页面 DTO。

GREEN：按 v4 §3.3/§11 的签名实现最小 immutable records/interfaces，不建万能 `AdminApi`。

验证：`backend/mvnw -f backend/pom.xml -pl shared-kernel,admin-api -am test`。

## Task 3：建立双 Flyway history 与双 jOOQ schema

新增：

- `schema-platform`、`schema-lastmile` Flyway locations/codegen 配置
- 两套最小 V1 migration 与 Testcontainers 集成测试
- generated package 分别为 `com.metabuild.schema.platform`、`com.metabuild.schema.lastmile`

RED：

- platform-only fresh DB、platform→lastmile fresh DB、重复 validate。
- 同 owner duplicate version fixture 必须失败。
- lastmile generated package 引用/生成 `mb_*` 必须失败；platform 生成 `biz_*` 必须失败。
- admin/platform 测试 profile 不加载 lastmile 仍可通过。

GREEN：两个显式 Flyway runner，history table 固定 `flyway_platform_history`/`flyway_lastmile_history`，platform 先执行；codegen 各自 include 单一前缀。

验证：`backend/mvnw -f backend/pom.xml -pl schema-platform,schema-lastmile -am verify`，并检查 generated diff 可重现。

## Task 4：建立 infrastructure 基线与 ProblemDetail 方言

新增/精选移植并改造：

- `infrastructure` 的 web/exception/i18n/observability/jooq/security 空边界
- `TraceIdFilter`、security headers、MessageSource、GlobalExceptionHandler
- json/void/blob/error 集成 fixtures

RED：覆盖 validation、malformed JSON、type mismatch、missing param/part、upload too large、405、415、领域冲突、unknown 500；所有响应检查 status/content-type/code/traceId。

GREEN：只实现错误方言与 filter 装配；非目标异常不得 catch 成 200 或通用 500。

验证：`backend/mvnw -f backend/pom.xml -pl infrastructure -am verify`。

## Task 5：建立 app、环境与开发运行基线

新增：

- `backend/app` Spring Boot 入口与配置
- `compose.dev.yml`（PostgreSQL 16 + Redis）
- `backend/.env.example`、`scripts/dev.sh`、健康检查
- contract ADR：transport/path/permission grammar/ID/origin

RED：配置绑定测试、缺 secret/错误 DB 时 readiness 失败、CORS 默认空、`/actuator/health/readiness` 依赖 DB/Redis；脚本 contract 先因资源缺失失败。

GREEN：本地进程可重复启动/停止，不提交密码；前端暂留根目录，P0a 不移动文件。

验证：Testcontainers app context + compose config 校验 + 启动后 curl health。

## Task 6：P0a 架构守卫与里程碑复审

新增：

- app ArchUnit：模块方向、admin 包纵切、lastmile 禁 platform schema/admin implementation、security 依赖隔离、infra slice allow-list
- 负向 fixture 与 Maven skip-tests 防绕过检查

RED：每条规则先用一个违规 fixture 证明会失败。

GREEN：清除 fixture 违规，运行 Task 1-5 全量 verify；对 P0a 做 issue-first 对抗 review，修完再通过。

验证：`backend/mvnw -f backend/pom.xml verify`、`git diff --check`、工作树确认未夹带用户 UI 文件。

## Task 7：P0b monorepo 归位

前置：用户 UI 脏改已经提交/明确归属，执行前重新核对 `git status`；未满足则保持 pending，不擅自吸收。

变更：

- 用 `git mv` 把现前端整体迁入 `frontend/`
- 更新 CI、pnpm working-directory、visual 脚本、原型路径、根 docs/CLAUDE/AGENTS、`scripts/dev.sh`
- Vite `/api` proxy 指向 backend

RED：路径守卫先断言根目录不再出现前端构建入口，并让现状失败。

GREEN：只改路径，不改 UI 行为。

验证：前端 tsc/eslint/vitest/theme/design/build、backend verify、root dev smoke 全绿。

## Task 8：P0.5 UUIDv7 与 DataScopePolicy 基础

新增：

- UUIDv7 generator/value serializer
- `AuthorizationState/Snapshot/Fence` 与 `DataScopePolicy`
- AST/ArchUnit ID 语义守卫

RED：UUID 时间排序、JSON/string round-trip、持久化/API/path/current-user ID 使用 Long 的负向 fixtures、system principal `0L` fixture、SELF/DEPT/CUSTOM 并集纯函数测试。

GREEN：只移植 UUID-native shared/security/jOOQ 基础；不导入旧 Long domain。

验证：局部 test + backend verify；独立对抗复审无阻断。

## Task 9：前端 requestCore 的 json/void/blob/multipart

变更：

- `frontend/src/lib/http/{client,errors,contract}.ts`
- `frontend/src/lib/download.ts`
- `frontend/src/app/query.ts`、request config 与测试

RED：json zod、204/205/empty 200、blob filename、multipart header、ProblemDetail、502 HTML fallback、trace header、abort/timeout、Retry-After、401 allow-list、single-flight 与 mutation auth replay。

GREEN：一个 requestCore + 三 decoder + body encoder；下载不再裸 fetch；BizError 保留完整 HTTP 信息。

验证：相关 Vitest、tsc、eslint；不先批量改 handler。

## Task 10：全量 mock 方言迁移

变更：`frontend/src/mocks/http.ts`、113 个 `biz()` 调用、所有 `ok(null)` void 场景、32 个 envelope 测试。

RED：helper contract 与每个域至少一条错误 fixture；旧 envelope 解析测试改为预期真实 HTTP 行为并先失败。

GREEN：`biz({status,code,detail,extensions})`、`noContent()`；逐调用点分配稳定领域错误码，不做四位码机械映射。

验证：全量 Vitest、tsc、eslint、demo build；搜索旧 `code: number`/envelope/bare fetch 零残留。

## Task 11：IAM UUID schema 与 bootstrap seed

新增 platform migrations：user（含持久 `authz_revision`）/dept/role（含五型 `data_scope_type`）/role_custom_dept/user_role、permission/role_permission、menu/menu_customization、refresh token、authz outbox、登录/操作日志；所有 ID UUID。

RED：FK/unique/check/soft-delete、部门防环数据库辅助约束、scope enum/custom relation 清理、authz_revision 单调递增、P1 bootstrap sourceKey/code 稳定、SELF+CUSTOM 与 OWN_CHILD+CUSTOM 数据 fixture、fresh/upgrade migration。

GREEN：最小 admin、角色、部门、Shell menu/permission seed；不实现管理写 API。

验证：schema Testcontainers + jOOQ reproducibility。

## Task 12：真实认证、refresh rotation 与原子授权快照

新增 admin auth application/security adapters：password login、refresh rotate、logout、snapshot compiler/store/request scope、refresh token user reverse index。

RED：真实 PostgreSQL+Redis+Sa-Token；login 写单 key snapshot、SaSession 无授权字段、token rotation/replay、logout 全撤销、低 revision login 不能覆盖 Fence、Redis 不可用 fail-closed。

GREEN：实现 P1 只读授权投影；不实现管理员 refreshUsers。

验证：`backend/mvnw -f backend/pom.xml -pl modules/admin,app -am verify`。

## Task 13：真实 `/me`、menus/subsystems 与前端 Shell 联调

新增 backend auth/menu controller/query；调整前端 auth/menu API contract 与真实模式启动。

RED：登录凭证错误、expired access refresh、`/me` 角色/权限、菜单 effective default/override、隐藏目录、当前 subsystem；前端契约直连 fixture。

GREEN：关闭 mock 后真实 DB 登录进入 Shell；当前 UI 行为不降级。

验证：Browser 登录/刷新/退出，API 与 DB/Redis 回证；错误 toast 显示 traceId。

## Task 14：权限 AST catalog、生成产物与 x-permissions

新增：

- route action 稳定 `key`
- `frontend/scripts/permissions/extract.ts`
- api-contract 两个生成 JSON
- OpenAPI `x-permissions {logic,codes}` customizer 与三方 diff 工具

RED：动态表达式/缺 key/重复 sourceKey/非法 colon code、deterministic output、backend consumed subset、单码/AND/OR OpenAPI snapshot。

GREEN：TypeScript compiler API，不执行 route graph；只生成并校验 classpath resources，不在本任务写数据库，避免早于 Task 16 暴露不安全 deprecate。

验证：generate/check、frontend tests、backend parser test、OpenAPI snapshot/diff。

## Task 15：Users/Departments/Role 管理后端

实现 users/depts/roles 包级纵切：列表/详情/筛选/CRUD、批量禁用、换部门、防环、子树 memberCount、系统角色保护、功能权限与五型数据范围。

RED：逐 use case 写 controller/service/repository tests；角色禁用/删除、自定义部门清理、用户软删除、部门移动 preimage 均覆盖。

GREEN：API 字段逐项匹配现有 zod；实现 `UserDirectoryApi/DepartmentDirectoryApi` adapter，单批 500、partial missing、固定次数批量 SQL；写 use case 必须依赖尚未装配的 `AuthorizationRefreshService` 端口，本任务不把写 controller 注册进 app，防止 Task 16 前出现可调用但不会安全刷新的运行态。

验证：模块测试 + OpenAPI/zod contract fixtures。

## Task 16：AuthorizationRefreshService、Fence、outbox 与 terminal 协议

实现 `AUTHZ_GRAPH` lock、批量 preimage、Lua fence/CAS、`authz:fenced`、outbox/reconciler、100 用户批处理、disable/delete terminal flow。

RED：commit/rollback、crash-before-commit abandoned fence、crash-after-commit、partial Redis failure、低 revision、并发 login、两实例、kickout/revoke 失败、旧 refresh token 不复活。

GREEN：每次变更固定批量查询和两次 Redis pipeline；只有同 operationId abandoned 分支可低 revision 回退。

验证：真实 PostgreSQL+Redis Testcontainers；SQL/Redis 次数断言；故障注入。

## Task 17：DataScope Listener 与启动期完备性校验

实现 UUID registry、Listener、bypass、schema completeness bean。

RED：五型单角色、SELF+CUSTOM、OWN_CHILD+CUSTOM、ALL 短路、无角色 deny-all、disabled/deleted role、纯 DEPT 不附赠 SELF、alias/JOIN/CTE/subquery、未注册新表启动失败。

GREEN：条件严格为 dept 分支 OR 可选 self 分支；热路径不抛配置异常；异步不传播 bypass。

验证：集成矩阵 + 对抗复审。

## Task 18：PermissionCatalogSynchronizer 与 IAM 写 API 装配

实现 catalog version/digest 表、startup synchronizer、default/customization 合并，以及 users/depts/roles/menus 写 controller 的最终装配。

RED：idempotent/fresh-upgrade、default 不覆盖 customization、rename alias、deprecate 影响用户走 Task 16 FENCE/outbox、并发实例只同步一次、同步失败不 ready；任何写 controller 缺 refresh protocol 时 context test 必须失败。

GREEN：synchronizer 按 `CATALOG_SEED → AUTHZ_GRAPH` 锁顺序运行；IAM 写 API 只有在 refresh/fence/reconciler bean 全部存在时才装配。

验证：真实 PostgreSQL+Redis startup/upgrade/integration tests。

## Task 19：前端 IAM 真实联调与 mock 退役

变更 users/roles/menus 的 API/scene/query invalidation；菜单 code-owned 字段只读、customization 可编辑；角色只编辑角色级数据范围。

RED：Browser/API contract、401/403/409/422、失效刷新、自改权限、批量禁用、部门防环、菜单 default/override。

GREEN：真实模式删除 IAM handler fallback，demo registry 保留同方言 mock。

验证：Browser + API + DB + Redis；前端全门禁与三档显示比例回归。

## Task 20：Dictionaries、Company、Profile 真实后端

按现有 zod 契约逐域实现 schema/repository/service/controller，并接前端。

RED：唯一性、内置字典保护、公司字段校验、资料/密码/偏好/设备、当前设备保护、权限与错误路径。

GREEN：每域完成后删除真实模式 mock fallback，保留 demo。

验证：逐域 Browser/API/DB + 模块/前端测试。

## Task 21：Messages、Audit、Dashboard 真实后端

实现站内信/审批状态机、未读数、操作/登录日志、CSV blob、dashboard 聚合。

RED：仅 pending 可审批、幂等 InboxPublisher、未读联动、筛选 CSV 内容、blob problem、真实计数无 mock todo 漂移。

GREEN：after-commit publish；审计切面属 infra、查询属 admin。

验证：Browser/API/DB/CSV 文件内容 + Shell 联动。

## Task 22：Files、Mail、SMS 与认证长尾

实现 local BlobStore、multipart、文件夹/配额/校验/SHA256 路径、capability tickets、register/forgot-password/sms/qr flow、rate limit。

RED：ext+MIME+size、穿越、非空目录、单次 ticket、越权、multipart ProblemDetail、爆破延迟/锁定、SMS 限流与 token 登录。

GREEN：业务模块只见 AttachmentApi/FileCatalogApi；不直连 BlobStore。

验证：Browser 上传/下载/预览 + API/DB/blob 回证；邮件/SMS 用 contract stub，不伪造外部送达。

## Task 23：Lastmile 独立 schema 与只读模型

实现 biz_* migrations/generated package，以及 overview/shipments/customers/channels/carriers/suppliers/billing 查询。

RED：lastmile 禁 platform table imports；跨域用户/文件摘要只经 admin-api 批量端口；分页/筛选/详情契约。

GREEN：先完成所有只读页面，真实模式关对应查询 mock。

验证：schema/ArchUnit、Browser/API/DB。

## Task 24：Lastmile 写模型与文件/通知能力

实现运单创建/打单/导出/轨迹，客户与授权，渠道 CRUD/启停/连接测试，承运商/供应商创建，账单筛选/导出。

RED：状态机、幂等、权限/数据范围、附件 ticket、通知 after-commit、PDF/CSV blob 错误路径。

GREEN：逐动作接真实前端，删除真实模式 handler fallback。

验证：完整 Browser 主链 + API/DB/file 回证。

## Task 25：真实模式 mock 清零与契约总账

建立 page/action→endpoint→zod→permission→data-scope→test→mock 状态矩阵，逐项关闭。

RED：守卫在任何生产路径引用 faker/msw/mock worker、任何 API 无 zod、任何 route action 无 backend consumption 时失败。

GREEN：demo 仍可独立运行，真实模式没有静默 fallback。

验证：全前端测试/build + dist 扫描 + backend verify + oasdiff。

## Task 26：派生项目、文档与一键启动验收

更新 `docs/architecture.md`、`docs/NEW-PROJECT.md`、顶层规则、增删子系统清单、env/seed/reset/lastmile 替换说明。

RED：文档路径/命令 contract、lastmile removal profile、fresh clone smoke 脚本。

GREEN：新 clone 按文档 30 分钟内启动；admin 核心与 lastmile 示例资产矩阵无歧义。

验证：在临时 clone 执行 bootstrap/dev/seed/smoke，不使用当前工作树缓存冒充。

## Task 27：P5 全栈生产级收口

工程门禁：

```bash
pnpm --dir frontend exec tsc -b --noEmit
pnpm --dir frontend exec eslint src
pnpm --dir frontend test
pnpm --dir frontend theme:guard
pnpm --dir frontend design:lint
pnpm --dir frontend build
backend/mvnw -f backend/pom.xml verify
git diff --check
```

验收：

1. Browser 覆盖 Admin/Lastmile 全主链、401/403/冲突/空态/失败恢复；90%/100%/108% 与主题矩阵无回退。
2. API/DB/Redis/OpenAPI/文件内容互相回证；安全/性能故障矩阵全绿。
3. 生产前端 bundle 无 faker/MSW/worker；oasdiff 无未裁定 breaking change。
4. 最终 whole-branch 对抗 review；Critical/Important 全修并复审。
5. Goal 只有在以上全部完成后才能标记 complete。
