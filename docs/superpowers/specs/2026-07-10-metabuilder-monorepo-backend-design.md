# MetaBuilder 全栈脚手架:后端抽离与 monorepo 重组设计

> 日期:2026-07-10(v2,吸收对抗性 review + Codex 交叉审查后修订)
> 状态:待洋哥审阅
> 来源:基于 meta-build(`/Users/ocean/Studio/01-workshop/02-软件开发/06-meta-build`)server 侧精选移植,配套本前端脚手架

## 1. 背景与目标

本前端脚手架(Vite + React + TanStack + shadcn/ui)目前只有 MSW mock,没有真后端。meta-build 已有一个接近完工、工程质量高的 Java 后端(Spring Boot 3.5 + Java 21 + jOOQ + PostgreSQL 16 + Flyway + Sa-Token + Redis,模块化单体,ArchUnit 守卫,`mvn verify` 实测 201 tests 全绿),但其对外契约为已被本脚手架取代的旧前端设计,且存在若干已实锤的实现/文档缺口(见 §2.1)。

**目标**:以「精选移植、重新定基线」方式,把 meta-build 的成熟实现移植为本前端脚手架的配套后端,组成 MetaBuilder 全栈 monorepo;继承其工程方法,修正其已证实的缺陷。

### 1.1 已实锤的 meta-build 缺陷(逐条代码核验过)

1. **x-permission 权限闭环是文档幻觉**:`PermissionOperationCustomizer` 只把权限码拼进 swagger 人类可读 description,无机器可读扩展;文档宣称的"前端权限码编译期校验"不存在。
2. **数据权限双重 fail-open**:`DataScopeExecuteListener` 拿不到用户上下文直接放行(异常也吞掉);只遍历顶层 FROM,别名/JOIN/CTE/子查询无注入证明;注册表仅 4 张表,未注册静默放行。
3. **权限变更不即时生效**:角色/授权变更后无会话失效(`kickout` 存在但未接线),需重新登录才生效。
4. **JWT + Redis session 双重状态**:`StpLogicJwtForSimple` + session 并存,JWT 无状态优势没吃到(踢人/在线用户本就要求有状态),白背复杂度。
5. **文档未来态/实现态混写**:8960 行 specs 存在计数级 drift 与未实现的"已完成"叙述。

## 2. 已定决策

| 决策项 | 结论 | 理由 |
|---|---|---|
| 形态定位 | **配套后端范本**:前端契约是唯一甲方 | 底座野心导致样本永远补不齐是 meta-build 的死法之一 |
| 抽离方式 | **精选移植,重新定基线**(非 fork 删业务) | 契约不兼容 + 29 模块偏重 + 文档漂移不能一起带过去 |
| 仓库形态 | monorepo:`frontend/` + `backend/`,现前端仓原地重组 | 保前端 git 历史 |
| 命名 | 系统叫 **MetaBuilder**;包名 `com.metabuild.*`、表前缀 `mb_` 保留 | 零重命名成本 |
| 模块结构 | Maven 压缩到约 **9-10 模块**(见 §3):infra 合并为单模块多包,业务按真边界拆 | 配套范本的启动/阅读/改名成本优先;权衡见 §3.1 |
| 认证 | 双 token(access + refresh rotation);**去掉 sa-token-jwt**,不透明 token + Redis session;保留 Sa-Token + CurrentUser/AuthFacade 门面 | B 端诚实有状态;ADR-0005 选型论证未被推翻,门面已隔离框架 |
| 会话新鲜度 | 角色/授权/菜单变更 → **kickout 受影响用户**(v1 最简实现) | 修 meta-build 已实锤缺陷 #3 |
| ID 设计 | 所有表 ID string 语义(**UUIDv7**,PG `uuid` 列);业务主档表另配人类可读编号 | 洋哥定;工程量按 §6 重新评估,不再称"最便宜" |
| 数据权限 | v1 角色级 5 型 scope;fail-closed 落在**启动期完备性校验**,热路径不 throw | 调研结论(附件)+ 对抗性 review V3 |
| API 路径 | 统一 `/api/*`,**无 `/v1` 前缀**;兼容性靠 oasdiff 门禁而非 URL 版本 | 前端是唯一消费者,URL 版本是仪式 |
| 权限动作词 | 以**前端词表为准**(`view/edit/...`),P0 契约 ADR 定死 | 前端契约甲方 |
| 租户 | (待洋哥确认)推荐**单租户 B 端,不留 tenant_id 半成品字段**,升级路径写 ADR | 前端契约无租户概念;"预留字段无路由"是假安全 |

## 3. 总体形态

```
MetaBuilder/                     ← 现「通用脚手架前端」仓库原地重组
├── frontend/                    ← 现前端代码整体迁入(原型 .dc.html 留在 frontend/ 根,visual 脚本依赖 cwd)
├── backend/
│   ├── app/                     # Spring Boot 入口、全局装配、跨模块集成测试 + ArchUnit
│   ├── shared-kernel/           # 纯 Java:异常、PageQuery/PageResult、CurrentUser/AuthFacade 接口、ID/编号约定
│   ├── schema/                  # Flyway + jOOQ generated(契约层,生成物入 git)
│   ├── infrastructure/          # 单模块多包:security/cache/web/jooq/exception/i18n/async/rate-limit/observability
│   ├── modules/
│   │   ├── identity/            # auth、用户、部门、角色、菜单、子系统、profile
│   │   ├── system/              # 公司、字典、配置
│   │   ├── file/                # 文件夹树、配额、multipart、存储 adapter(v1 local)
│   │   ├── audit/               # 操作日志、登录日志、CSV 导出
│   │   ├── notification/        # 站内信、审批收件箱(messages)
│   │   └── lastmile/            # P4 业务样板(业务扩展位范本)
│   └── api-contract/            # OpenAPI 基线 + oasdiff 兼容检查
├── docs/                        # 架构文档、specs/plans、ADR、规则库(meta-build 择要迁入)
└── CLAUDE.md                    # 顶层 AI 契约(索引式);frontend/、backend/ 各有分册
```

- backend 不带 meta-build git 历史;新仓首个 ADR 记录血统与决策继承。meta-build 原仓保留作参考档案。
- 模块内保持 `api / domain / web` 三层包;跨模块只依赖对方 `api` 包,ArchUnit 守卫;单测/模块测试放各模块,app 只留跨模块集成测试与架构测试。
- **前端契约是甲方**:各域 `api/schema.ts` 的 zod schema 就是后端接口规格书。每域 DoD = 前端关 mock 真连后端,页面业务可用。

### 3.1 模块压缩的权衡(明示)

infra 12 子模块合并为单个 `infrastructure` 后,「只有 infra-security 能依赖 Sa-Token」这类约束从 **Maven pom 级(编译期不可见)降级为包级 ArchUnit 单保险**。接受理由:配套范本的 reactor 开销、AI 阅读成本、派生项目改名成本更重要;业务模块之间仍保持 Maven 级隔离(modules/ 下各自独立模块);ArchUnit 包级 import 禁令(meta-build 已有同类规则)覆盖同一约束面。

## 4. 移植与裁剪

### 4.1 移植(带原实现与测试)

六边形不变量:Flyway+jOOQ schema 契约层与 codegen 流水线、CurrentUser/AuthFacade 双门面、DataScopeExecuteListener + Registry + @BypassDataScope(按 §7 改造)、ProblemDetail + 稳定错误码 + traceId、三段式分页、缓存纪律(key 级失效 + afterCommit)、@OperationLog、ShedLock、Testcontainers 共享容器 + MockCurrentUser、OpenAPI 快照测试、enforcer/flatten、类型化配置 + Clock Bean、结构化日志。

### 4.2 按前端契约改造

| 域 | 改造内容 |
|---|---|
| 菜单/子系统 | 重做:前端模型(Subsystem + MenuRecord 三型 dir/menu/action + i18n label map,扁平列表前端组树);砍 route_tree 双树 |
| 认证 | 双 token 去 JWT;补 sms-code/sms-login/qr-login;`/me` 返回 `{user, roles, permissions}`;登录失败 4xx ProblemDetail 带码;**SMS 发码接 rate-limit(防轰炸)** |
| IAM | users/depts/roles 契约对齐:部门树防环、memberCount 子树聚合(排除 left)、高级筛选(filters JSON)、批量禁用、系统角色保护、角色审计日志、**授权变更 kickout 接线** |
| 文件 | 文件夹树、配额概览、真 multipart;`FileStorage` 接口保留,v1 仅 local 实现(S3 adapter 登记 pre-prod) |
| 消息 | 站内信 + 审批收件箱:category、unreadCount、审批状态机(仅 pending 可审) |
| 新增小域 | subsystems、dashboard overview(app usecase 聚合;mock 里的 todo 组件**删或立域,P3 时定**)、profile(安全/偏好/设备)、company |
| 邮件 | **极简纯文本 SMTP**(register/forgot-password 两页的真实依赖,无模板引擎);Thymeleaf 模板体系不搬 |

### 4.3 不搬

SSE(前端零消费,grep 证实)、微信公众号/小程序渠道、图形 captcha(前端只有短信码)、platform-monitor(前端 dashboard 是业务计数不是系统指标)、business-notice/exam(lastmile 顶替;写模块时回原仓参考 notice 全特性实现)、Spec 引擎/AI 循环引擎、历史 handoff/日志/归档、8960 行 specs、纯预防性 `allowEmptyShould(true)` 规则。

## 5. 契约对齐分工(修订:不再是"只改 adapter")

**后端不迁就前端方言**:ProblemDetail + 业务对象直出 + PageResult 保持(R\<T\> 包装是 nxboot 血泪 MUST NOT)。

**前端侧是一次明确的 http 层重构,不是防腐层微调**(对抗性 review V4 实锤:`client.ts` 在 `res.ok` 为 false 时先于 envelope 解析抛裸 `HttpError`,ProblemDetail body 永远读不到):

1. **client.ts 错误路径重构(显式工作项)**:非 2xx 先读 body、嗅探 `application/problem+json`、抽 code/detail → 抛 `BizError`;修复后所有 mutation 错误恢复后端友好文案(当前会退化为泛化 toast)。
2. **on401:'reject' 保留 body**:登录页需区分密码错/锁定等语义。
3. **refresh 拦截器**:`request()` 改可重试 + 模块级共享刷新 Promise(防抱团)+ 重试用新 AbortController;与错误路径重构同批做(耦合)。
4. **adapter.ts** 承担纯方言映射:分页 `{content,totalElements}→{list,total}`、`pageSize→size` 参数改写。
5. 文件流(CSV/下载)不走 envelope;multipart 上传按 adapter 备忘走例外协议。
6. **错误 shape 回归**:双向契约测试只覆盖成功 shape,错误路径(ProblemDetail→BizError→UI 文案)单独补回归用例。

## 6. ID 与编号设计(修订:重新 scope,不再称"一次性最便宜")

**决策不变**(全表 string ID = UUIDv7 + PG uuid 列;业务主档表配编号),**工程认知修正**:这是多日、跨切面、安全敏感的重构(27 表/约 106 列、jOOQ 57 文件重生成、约 110 个 Java 文件、`currentUser.userId()` 92 处调用点),作为 **P0.5 独立 gated 子阶段**执行:

1. **承重墙**:`CurrentUser.userId()` 接口签名 Long→UUID;Sa-Token `getLoginIdAsLong()` 全部改 `getLoginIdAsString()`(否则运行时 NumberFormatException);`RefreshTokenService.Long.parseLong` 同改。
2. **安全敏感点单独对抗性 re-review**:`DataScopeExecuteListener` 的 `DSL.field(name, Long.class)` 是纯 cast,编译期不报错,漏改可能静默返回错行(跨部门泄漏)——逐 scope 分支改造并重验,不信任编译器。
3. **系统用户哨兵**:`0L` 改为保留 UUID 常量,统一收敛(AuditFieldsRecordListener 等 ≥3 处)。
4. **UUIDv7 生成**:引入成熟库(如 uuid-creator);加不变量守卫测试:`ORDER BY id DESC = 最新优先` 仅在 v7 下成立。
5. **编号是净新增功能(greenfield),不是 ID 手术副产品**:`前缀-日期-日序列` 的每日归零 + 并发安全非平凡(advisory lock 或按日 sequence),独立设计与实现,仅覆盖业务主档表。
6. **守卫**:ArchUnit 禁 api 层出现 Long 型 id;DDL 清单主档表必有 `no` 列。

## 7. 数据权限设计(修订:fail-closed 落点改为启动期)

模型不变:角色级 5 型 scope,登录展开 deptIds 存 session,jOOQ Listener 单点注入。升级路径不变(v2 资源默认策略→v3 共享规则→v4 策略引擎,详见调研附件)。**执行点修正**(对抗性 review V3:运行时查询期拒绝会把登录链路和全部未注册系统表锁死):

1. **启动期完备性校验(fail-closed 的正确落点)**:应用启动时枚举 jOOQ schema 全部表,每张表必须属于 `DataScopeRegistry`(受保护)或显式白名单(公共/系统表)之一,**否则启动失败**。热路径(查询期)绝不 throw。
2. **差集守卫测试**:同一校验在测试层跑(含 `owner_dept_id` 列的表必须注册;`mb_iam_role` 这类含列但语义特殊的表须显式裁定归属)。
3. **上下文缺失语义**:登录前查询(未认证态)天然放行,登录后已认证用户按 scope 注入——保持;但 `resolveCurrentUser` 吞异常改为记警告 + metrics(不静默)。
4. **@Async 传播**:`@BypassDataScope` 的 ThreadLocal 不随 TaskDecorator 传播(已证实),修 decorator 或禁止 async 路径依赖 bypass。
5. **注入覆盖证明**:集成测试矩阵覆盖别名/JOIN/CTE/子查询场景,明确记录 v1 只保证顶层 FROM 注入的边界(与 meta-build 相同),把"子查询绕过"列入已知限制并在 12 步清单中提示 Repository 写法约束。
6. 前端资源级覆盖矩阵 UI 降级(拆 `RoleDataPermissionEditor` 的 resources 区 + schema,这是真实前端返工项,归 P2)。

## 8. 工程护栏(继承 + 超越)

**继承**:ArchUnit 规则集(按新结构改写)、OpenAPI 快照 + drift CI、enforcer/flatten、12 步清单 + OpenSpec 工作流、TDD 纪律、ADR 文化。

**超越 meta-build 的七件事**:
1. fail-closed 数据权限(启动期完备性校验,§7)。
2. **x-permissions 机器可读化**:`@RequirePermission` → OpenAPI 真扩展字段 → 前端权限类型/校验从 OpenAPI 生成,替换手写权限表。
3. **三方差集 CI**:后端权限点(OpenAPI)↔ 前端 `staticData.actions` ↔ 数据库 seed,三方 diff 守卫。
4. **seed 管线**:前端 manifest `menuSeed` + `staticData.actions` → 生成后端菜单/权限 seed。
5. **双向契约测试**:前端 zod contract 跑在后端真实响应上(成功 shape)+ 错误 shape 回归(§5.6)。
6. **oasdiff breaking-change 门禁**(不只 snapshot drift)。
7. **文档极简**:约束进测试,文档只写 why(ADR + 索引式 CLAUDE.md);specs 不复制。

**生产化(v1 范围)**:Dockerfile + 健康检查;SBOM/依赖漏洞门禁、S3 存储 adapter、refresh 重放入侵检测(kickoutAll)→ 登记 pre-prod 清单。

## 9. 分期路线(修订:Shell 优先,修正 P1/P2 倒置)

| 阶段 | 内容 | 下班信号(DoD) |
|---|---|---|
| **P-1 前置** | 落地当前前端 in-flight 迁移(约 145 文件的菜单边界重构等),工作树收敛、全绿提交 | `pnpm test`/`tsc`/`eslint` 绿,git 状态干净 |
| **P0 重组与骨架** | git mv 进 frontend/(原型 .dc.html 留 frontend/ 根);backend 新骨架 + 基建精选移植;**CI 重写**(前端 job 加 working-directory + 新增 Maven job);**契约 ADR**(路径/错误/分页/动作词/ID);顶层 CLAUDE.md | 双侧编译测试全绿,CI 双 job 过 |
| **P0.5 ID/编号手术(gated)** | §6 全部;DataScope 类型改造单独对抗性 re-review | `mvn verify` 绿 + 数据权限测试矩阵绿 |
| **P1 认证 + Shell 基线** | 双 token(去 JWT)+ 前端 client.ts 错误路径重构 + refresh 拦截器 + `/me` + **subsystems/menus 域**(Shell 的 `useSuspenseQuery` 依赖,不先做 Shell 挂不起来) | 前端关 mock:登录进 Shell,导航渲染,错误页正常 |
| **P2 IAM + 权限闭环** | users/depts/roles + permissions/tree + 角色功能/数据权限(角色级)+ x-permissions + seed 管线 + 三方差集 + kickout 接线 + fail-closed 启动校验 + 前端资源级矩阵降级 | IAM 三页可用;越权测试矩阵绿;seed 自动生成 |
| **P3 长尾域** | messages/files/dict/audit/profile/company/dashboard + 极简邮件(register/forgot-password)+ SMS 限流 | 全平台页关 mock 可用 |
| **P4 业务样板** | lastmile 前后端成对 + 12 步清单按新仓校准 | 照清单从零加一个域全程走通 |

每阶段完成做 review(形态匹配优先);P0.5 与 P2 数据权限属关键不可逆决策,执行前再做对抗性 review。

## 10. 对 Codex 建议的裁定(交叉审查记录)

| Codex 建议 | 裁定 | 理由 |
|---|---|---|
| 精选继承重新定基线(方案 2) | ✅ 采纳 | 与对抗性 review 结论一致 |
| 模块压缩到 8-10 | ✅ 采纳(权衡明示 §3.1) | |
| x-permissions 补真 + 三方差集 | ✅ 采纳(claim 已核验属实) | |
| 会话 authorizationVersion | ✅ 采纳变体:v1 用 kickout 接线(更简) | |
| 去掉 JWT+Redis 双重状态 | ✅ 采纳:去 sa-token-jwt | |
| 换 Spring Security | ❌ 拒绝 | ADR-0005 论证未被推翻;门面层已隔离框架;换框架是"现象当问题"(meta-0023) |
| 删 tenant_id 半成品 | ✅ 采纳(待洋哥确认单租户定位) | |
| S3 adapter / SBOM 门禁 | ⏸ 登记 pre-prod | v1 镀金风险 |
| 现在做可配置生成器(方案 3) | ❌ 拒绝(与 Codex 自己的建议一致):派生 2-3 个项目后再说 | |
| oasdiff breaking-change 检查 | ✅ 采纳 | |
| 测试放回各模块 | ✅ 采纳(集成测试留 app) | |

## 11. 风险与遗留

- **P-1 是 P0 的硬前置**:当前未提交改动是一次大型 in-flight 迁移,必须先落地跑绿,否则重组 diff 无法归因。
- **ID 手术是多日安全敏感重构**(§6),P0.5 期间冻结业务逻辑改动;DataScope 改造必须二次对抗 review。
- **client.ts 错误路径重构**改变所有请求的错误行为,需错误 shape 回归覆盖。
- refresh 重放入侵检测、S3、SBOM、资源级数据权限 → pre-prod 清单,触发条件明确后再立项。
- meta-build 文档不搬 ≠ 经验丢失:ADR 择要(0003/0004/0005/0007/0008/meta-0023)与规则库精华迁入 docs/。

## 12. 非目标(v1 明确不做)

Spec 引擎 / AI 循环引擎;多租户(含 tenant_id 占位字段,待确认);资源级数据权限与共享规则(路径已预留);SSO/LDAP/OIDC、2FA;消息队列、微服务;SSE/WebSocket(消息中心 v1 轮询);可配置项目生成器;SBOM/漏洞门禁(pre-prod)。

## 13. 参考

- meta-build 原仓:`/Users/ocean/Studio/01-workshop/02-软件开发/06-meta-build`
- 前端契约真相源:`src/modules/*/api/schema.ts`、`src/mocks/`、`src/lib/http/{client,adapter}.ts`、`src/config/request.ts`
- 数据权限调研附件:`2026-07-10-data-permission-research-annex.md`
- 对抗性 review 关键证据:`client.ts:104`(非 2xx 早抛)、`Shell.tsx:18-19`(useSuspenseQuery 依赖 menus 域)、`DataScopeExecuteListener.java:39-59,74+`(fail-open + Long cast)、`SaTokenCurrentUser.java:41`(getLoginIdAsLong)、`PermissionOperationCustomizer.java:22`(description-only)、`RoleService.java:154+`(变更无会话失效)、`SaTokenJwtConfig.java:28`(JwtForSimple)
