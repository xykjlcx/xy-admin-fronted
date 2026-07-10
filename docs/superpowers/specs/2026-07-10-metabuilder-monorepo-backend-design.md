# MetaBuilder 全栈脚手架:后端抽离与 monorepo 重组设计

> 日期:2026-07-11(v3)
> 修订记录:v1 初稿 → v2 吸收一轮对抗 review + Codex 交叉审查 → **v3 吸收二轮对抗 review(自洽性 + 战略层)+ 洋哥两项设计指令(modules 对齐前端子系统、方言统一)**
> 状态:待洋哥终审
> 来源:基于 meta-build(`/Users/ocean/Studio/01-workshop/02-软件开发/06-meta-build`)server 侧精选移植,配套本前端脚手架

## 1. 背景与目标

本前端脚手架(Vite + React + TanStack + shadcn/ui)目前只有 MSW mock。meta-build 已有一个接近完工、工程质量高的 Java 后端(Spring Boot 3.5 + Java 21 + jOOQ + PostgreSQL 16 + Flyway + Sa-Token + Redis,模块化单体,ArchUnit 守卫,`mvn verify` 实测 201 tests 全绿),但其对外契约为已被本脚手架取代的旧前端设计,且存在已实锤的实现/文档缺口(§1.1)。

**目标**:以「精选移植、重新定基线」把 meta-build 的成熟实现移植为配套后端,组成 MetaBuilder 全栈 monorepo;继承其工程方法,修正其已证实的缺陷。

### 1.1 已实锤的 meta-build 缺陷(逐条代码核验)

1. **x-permission 权限闭环是文档幻觉**:`PermissionOperationCustomizer` 只把权限码拼进 swagger description,无机器可读扩展。
2. **数据权限双重 fail-open**:`DataScopeExecuteListener` 拿不到用户上下文直接放行(异常也吞);只遍历顶层 FROM;注册表仅 4 张表,未注册静默放行。
3. **权限变更不即时生效**:角色/菜单/授权变更后会话零处理(kickout 全链路实现但零调用方)。
4. **JWT + Redis session 双重状态**:`StpLogicJwtForSimple` + session 并存,JWT 无状态优势没吃到。
5. **文档未来态/实现态混写**:8960 行 specs 存在计数级 drift 与未实现的"已完成"叙述;CLAUDE.md 与 AGENTS.md 双手抄已漂移。

## 2. 已定决策

| 决策项 | 结论 | 理由 |
|---|---|---|
| 形态定位 | **配套后端范本**;前端是**功能语义**的甲方(域/端点/字段/业务规则),**传输方言按工程优劣定**(见下行) | 一轮定;v3 把"甲方"拆为功能语义与传输方言两层(洋哥指令) |
| 传输方言 | **统一,不用 adapter 做方言映射**:HTTP 语义 + ProblemDetail(RFC 9457)+ 业务对象直出;**分页字段名让给前端 `{list,total}`**(PageResult 改名,零架构代价);**mock 层说同一方言**(`ok()/biz()` helper 改形) | 自家 monorepo 双方言 = 调试税/工具链税/mock 双轨税/AI 心智税;200-always 使网关/监控/devtools/Query retry 全致盲;详见 §5 |
| 抽离方式 | 精选移植,重新定基线(非 fork 删业务) | 契约不兼容 + 29 模块偏重 + 文档漂移不能带走 |
| 仓库形态 | monorepo:`frontend/` + `backend/`,现前端仓原地重组 | 保前端 git 历史 |
| 命名与派生立场 | 系统叫 **MetaBuilder**;包名 `com.metabuild.*`、表前缀 `mb_` 保留;**派生项目即认领此命名空间,不 rename**(写入 NEW-PROJECT.md 后端章) | 零重命名成本;派生 rename 是多日手术,立场先写死 |
| 后端模块分组 | **与前端子系统对齐**:`modules/admin`(内核子系统,包级纵切)+ `modules/lastmile`(业务子系统范本);技术引擎下沉 `infrastructure` | 洋哥指令;镜像对称是范本核心资产,详见 §3 |
| Origin 拓扑 | **dev 用 vite proxy 同源**(`/api` → 本地后端,免 CORS);**prod 默认同域反代**(nginx `/api` → 后端);CORS 配置保留但默认空,仅真跨域部署启用 | 二轮 review A2(🔴):不写死会 dev/prod 各拍一次;同源免掉整类问题 |
| 认证 | 双 token(access + refresh rotation);去 sa-token-jwt,不透明 token + Redis session;保留 Sa-Token + CurrentUser/AuthFacade 门面 | B 端诚实有状态;ADR-0005 未被推翻 |
| 权限变更生效 | **会话内权限刷新**(重算 permissions 覆盖 account-session,全设备下次请求生效,不强制登出);kickout 只留给账号禁用/安全事件 | 二轮 review S3(🔴):刷新原语在 `AuthService.refresh()` 已现成;kickout 有自踢/连环踢等误伤 |
| 权限码真相源 | **前端路由 `staticData`(页面 permission + actions)是权限码唯一声明源**;manifest `menuSeed` 只引用不新增(CI 校验);单向生成后端 seed;后端 `@RequirePermission` 经 OpenAPI `x-permissions` 导出做 **diff 校验**(不反向生成前端) | 二轮 review S2/S6-a:前端两套码源已发散(menuSeed 独占 `:view`,staticData 独占若干),必须单源单向 |
| ID 设计 | 全表 string ID(UUIDv7,PG `uuid` 列);业务主档表配人类可读编号 | 洋哥定;工程量按 §6 评估 |
| 数据权限 | v1 角色级 5 型 scope;fail-closed 落在**启动期完备性校验**(运行时 Spring bean,非 ArchUnit) | 调研附件 + 一轮 V3 + 二轮 S4 |
| API 路径 | 统一 `/api/*` 无版本前缀;兼容性靠 oasdiff 门禁 | 前端是唯一消费者 |
| 权限动作词 | 以前端词表为准(`view/edit/...`),P0 契约 ADR 定死 | 功能语义甲方 |
| 租户 | 单租户 B 端,**不留 tenant_id 字段**;升级路径写 ADR(加列+回填+路由一次做全) | "预留字段无路由"是假安全 |
| 演示数据 | **demo 恒走 mock**(`build:demo` 已如此);真后端只 seed 引导数据(admin + 菜单/权限 + 最小字典),丰富演示数据不进后端 seed | 二轮 A3:开箱门面由 demo-mock 保住,后端 seed 克制 |
| 错误文案归属 | **后端 MessageSource 出本地化 detail**(已建成,别拆);前端请求带 `Accept-Language`(当前 UI locale),toast 直显 detail + traceId | 二轮 A6:反向"前端查表"要新建映射,更贵 |

## 3. 总体形态

```
MetaBuilder/                     ← 现「通用脚手架前端」仓库原地重组
├── frontend/                    ← 现前端整体迁入(原型 .dc.html 留 frontend/ 根,visual 脚本依赖 cwd)
├── backend/
│   ├── app/                     # Spring Boot 入口、全局装配、跨模块集成测试、ArchUnit
│   ├── shared-kernel/           # 纯 Java:异常、分页、CurrentUser/AuthFacade 接口、ID/编号约定
│   ├── schema/                  # Flyway + jOOQ generated(全部子系统的表,生成物入 git)
│   ├── infrastructure/          # 技术横切引擎(单模块多包):security/jooq/cache/web/exception/i18n/
│   │                            #   async/rate-limit/observability + 文件存储 adapter/邮件短信发送/@OperationLog 切面
│   ├── modules/
│   │   ├── admin/               # 内核子系统(一个 Maven 模块,内部包级纵切,与前端 modules/admin 镜像)
│   │   │   ├── auth/ users/ depts/ roles/ menus/(含 subsystems)
│   │   │   └── dashboard/ messages/ files/ dictionaries/ company/ profile/ audit/
│   │   └── lastmile/            # 业务子系统范本(P4,与前端 modules/lastmile 镜像):
│   │                            #   shipments/ customers/ channels/ carriers/ suppliers/ billing/
│   └── api-contract/            # OpenAPI 基线 + oasdiff 兼容检查
├── docs/                        # 架构文档、specs/plans、ADR、规则库(meta-build 择要迁入)、NEW-PROJECT.md
└── CLAUDE.md                    # 顶层 AI 契约(唯一手维护真源;AGENTS.md 由它生成或软链,禁双手抄)
```

Maven 模块 ≈ 7 个。模块内 `api / domain / web` 三层包;单测/模块测试放各模块,app 只留跨模块集成测试与架构测试。

### 3.1 模块压缩的权衡(明示,二轮 S5 加重)

infra 12 子模块合并为单 `infrastructure` 后:

1. 「只有 security 包依赖 Sa-Token」从 **Maven classpath 物理隔离(编译不过)降级为 ArchUnit 测试期规则**,`-DskipTests` 即可放行违规 → **ArchUnit 测试设为不可跳过的硬门禁**(CI 强制 + 本地 verify 钩子)。
2. Sa-Token 依赖若为 compile scope 会**传递导出**给业务模块,连业务层编译兜底也丢 → Sa-Token 在 infrastructure 中声明为 **provided/optional 或拆独立薄 jar**,保住编译兜底。
3. 原 Maven pom DAG 隐含的 **infra 子包间拓扑**(如 cache 不得依赖 sse)无规则替补 → **净新增 ArchUnit slice 规则**(`slices().matching("…infra.(*)..")` + allow-list)。

业务域边界(admin 内跨域、跨子系统)全靠 ArchUnit 包规则——与前端 `module-boundaries.test.ts` 的守卫方式同构,这个对称性本身是范本卖点。

### 3.2 依赖规则(ArchUnit,与前端镜像)

- `modules/* → infrastructure/shared-kernel/schema`,反向禁止(镜像前端"components 禁 import modules")。
- 子系统内跨业务域只经对方 `api` 子包(镜像前端归属决策树)。
- **admin 是内核子系统**(与前端 CLAUDE.md 同句):业务子系统只可依赖 admin 的 `api` 包;admin 不依赖任何业务子系统。
- 引擎/页面域切分:文件存储、通知发送、审计切面是**引擎**(infrastructure,lastmile 也要用);`files/messages/audit` 在 admin 下的是**页面 API(业务域)**——防止 lastmile 依赖 `admin/files` 的脏边。

### 3.3 核心/示例边界与派生(二轮 A1)

- **核心(派生项目 merge 回流)**:app/shared-kernel/schema(平台表)/infrastructure/modules/admin。
- **示例(派生项目整包替换,不回流)**:modules/lastmile(与前端 lastmile 同命运)。
- 派生机制沿用前端 NEW-PROJECT.md 既有立场(外包 clone-and-diverge / 自有产品浅分叉常 merge);**P0 把 NEW-PROJECT.md 迁入顶层 docs/ 并补后端实例化章**(DB 名/seed 重置/.env/包名立场)。

## 4. 移植与裁剪

### 4.1 移植(带原实现与测试)

Flyway+jOOQ 契约层与 codegen 流水线、CurrentUser/AuthFacade 双门面、DataScopeExecuteListener + Registry + @BypassDataScope(按 §7 改造)、ProblemDetail + 稳定错误码 + traceId(GlobalExceptionHandler 8 处已带 traceId)、三段式分页(PageResult 字段改名 `{list,total}`)、缓存纪律、@OperationLog、ShedLock、Testcontainers 共享容器 + MockCurrentUser、OpenAPI 快照测试、enforcer/flatten、类型化配置 + Clock Bean、结构化日志(prod JSON + traceId/userId)、TraceIdFilter、SlowQueryListener、i18n(MessageSource + AcceptHeaderLocaleResolver + 分模块 bundle)。

### 4.2 按前端契约改造(域映射至 modules/admin 各包)

| 域 | 改造内容 |
|---|---|
| menus(含 subsystems) | 重做:前端模型(Subsystem + MenuRecord 三型 + i18n label map,扁平列表);砍 route_tree 双树 |
| auth | 双 token 去 JWT;补 sms-code/sms-login/qr-login(greenfield);`/me` 对齐 `{user,roles,permissions}`;登录失败 4xx ProblemDetail;SMS 发码接 `@RateLimit`(注解已有但全仓零使用,首次启用) |
| users/depts/roles | 契约对齐:部门树防环、memberCount 子树聚合(排除 left)、高级筛选(filters JSON)、批量禁用、系统角色保护、角色审计日志;**授权/角色/菜单变更 → 会话内权限刷新**(口径统一,含 §2 决策) |
| files | 文件夹树、配额、真 multipart;`FileStorage` 接口 + local 实现(ext+MIME+size 白名单 + SHA256 派生路径已根治穿越,随迁);S3 adapter 登记 pre-prod |
| messages | 站内信 + 审批收件箱:category、unreadCount、审批状态机(仅 pending 可审) |
| dashboard | app usecase 聚合业务计数;mock 里 todo 组件 P3 时**删或立域**,不悬置 |
| dictionaries/company/profile | 按前端 zod 契约实现;profile 含安全设置/偏好/设备 |
| audit | 操作/登录日志查询 + CSV 导出;切面引擎在 infrastructure |
| 邮件 | 极简纯文本 SMTP(register/forgot-password 真实依赖);Thymeleaf 模板体系不搬 |

**安全基线移植清单(二轮 A4)**:
- **随迁(v1)**:SecurityHeaderFilter(XCTO/XFO/CSP/Referrer)、CORS 配置(默认空)、上传三重校验、密码复杂度 + 首登强改(已建成且 seed 的 admin 依赖它,顺手带)、登录爆破节流(**解耦图形 captcha**:meta-build 失败≥3 强制 captcha 的升级档随 captcha 裁剪而失效,v1 采用失败计数 → 延迟 → 锁定,SMS 挑战留升级位)。
- **pre-prod 登记**:HSTS(需 HTTPS)、密码历史/过期(代码在无调用)、审计防篡改(v1 明示:append-only 靠约定)、SBOM/依赖漏洞门禁。
- CSRF 立场:header-Bearer 天然免疫,声明即可。

### 4.3 不搬

SSE(前端零消费)、微信公众号/小程序渠道、Thymeleaf 邮件模板、图形 captcha、platform-monitor、business-notice/exam(lastmile 顶替;写模块时回原仓参考 notice 全特性)、Spec 引擎/AI 循环引擎、历史 handoff/日志/归档、8960 行 specs、纯预防性 `allowEmptyShould(true)` 规则、**生产 Dockerfile(二轮裁定:meta-build 本无 Dockerfile,v1 先把 dev loop 跑顺,生产镜像/nginx/优雅停机 → pre-prod)**。

## 5. 传输方言统一(v3 重写:不再有 adapter 方言映射)

**判断依据**(洋哥指令下的独立分析):防腐层的正当场景是"不拥有对端";自家 monorepo 双方言 + 翻译层隔离的是自己与自己的分歧,纯付调试/工具链/mock 双轨/AI 心智四种税。统一方向按维度判:错误语义与成功响应**后端方言客观占优**(HTTP 语义让网关/监控/devtools/TanStack Query 生态免费工作;200-always 是方言孤岛);分页字段名**前端占优**(纯命名,PageResult 改名零代价)。

**统一后的唯一方言**:
1. 成功:`2xx` + 业务对象直出(无信封);分页 `{list, total}`。
2. 错误:`4xx/5xx` + `application/problem+json`(RFC 9457),扩展字段 `code`(稳定点分错误码,string)+ `traceId` + 本地化 `detail`(后端 MessageSource,按 `Accept-Language`)。
3. 登录失败等业务性 401 同走 ProblemDetail;前端以"请求是否带 token"区分会话过期与凭证错误。
4. 文件流(CSV/下载)与 multipart 上传是既定例外,不走 JSON。

**前端工作项(P1,client 层一次重构到位)**:
1. `client.ts`:删 envelope 解析;2xx 直出走 zod contract;非 2xx 读 body 嗅探 problem+json → `BizError(code, detail, traceId)`;`errors.ts` 加 `traceId` 字段,全局 toast 显示 detail + traceId(报障可用)。
2. 请求头带 `Accept-Language`(当前 UI locale)——否则 UI 切英文后端仍回中文文案。
3. refresh 拦截器:`request()` 改可重试 + 共享刷新 Promise + 重试新 AbortController。
4. **mock 层同方言改形**:`src/mocks/http.ts` 的 `ok()` 直出、`biz()` 产出 4xx + problem+json(内置 4 位码 → HTTP status + 点分 code 映射表);113 处调用点签名尽量保留,handler 逐个校对语义。开发态=联调态,mock 双轨制消灭。
5. `config/request.ts` 的 envelope 配置项删除;`adapter.ts` 退役为"将来对接外部第三方后端才启用"的空钩子(或直接删除,YAGNI)。
6. 双向契约测试变为零翻译直连:前端 zod contract 直接断言后端真实响应;错误路径(problem+json → BizError → toast)补少量专用回归用例。

## 6. ID 与编号设计(v2 定稿,保持)

全表 string ID = UUIDv7 + PG `uuid` 列;业务主档表配编号。这是多日、跨切面、安全敏感的重构(27 表/约 106 列、jOOQ 57 文件重生成、约 110 个 Java 文件、`currentUser.userId()` 92 处),作为 **P0.5 独立 gated 子阶段**:

1. 承重墙:`CurrentUser.userId()` Long→UUID;`getLoginIdAsLong()` 全改 `getLoginIdAsString()`;`RefreshTokenService.Long.parseLong` 同改。
2. `DataScopeExecuteListener` 的 `DSL.field(name, Long.class)` 是纯 cast 编译期不报错,漏改可能静默返回错行——逐 scope 分支改造,**单独对抗性 re-review**。
3. 系统用户哨兵 `0L` → 保留 UUID 常量(≥3 处收敛)。
4. UUIDv7 引入成熟库(uuid-creator);守卫:`ORDER BY id DESC = 最新优先` 不变量测试;ArchUnit 禁 api 层 Long 型 id。
5. 编号是 greenfield(每日归零序列的并发安全非平凡:advisory lock 或按日 sequence),独立设计,仅业务主档表。

## 7. 数据权限设计(v2 方案 + 二轮 S4 实现注记)

模型:角色级 5 型 scope,登录展开 deptIds 存 session,jOOQ Listener 单点注入;升级路径 v2 资源默认策略 → v3 共享规则 → v4 策略引擎(调研附件)。

1. **启动期完备性校验**:枚举 **jOOQ 生成 schema** 的全部表(二轮证实这是正确基准,`information_schema` 会有 shedlock/flyway 假阳性),每张表 ∈ 注册表 ∪ 显式白名单,否则启动失败;**实现为运行时 Spring bean(ApplicationReady 前),不能用 ArchUnit**(生成代码被 `DoNotIncludeGeneratedJooq` 刻意排除在扫描外)。热路径绝不 throw。
2. 差集守卫测试:含 `owner_dept_id` 列必须注册(`mb_iam_role` 类特殊表显式裁定);**同时校验注册表的 dept 列与 `created_by` 列真实存在且类型正确**(Listener 对两列有隐含假设)。
3. 上下文缺失语义:未认证态放行(登录链路依赖);`resolveCurrentUser` 吞异常改为警告 + metrics。
4. `@BypassDataScope` ThreadLocal 不随 TaskDecorator 传播(已证实)→ 修 decorator 或禁 async 依赖 bypass。
5. 注入覆盖:集成测试矩阵覆盖别名/JOIN/CTE/子查询;v1 只保证顶层 FROM 注入,"子查询绕过"列入已知限制,加模块清单里写明 Repository 写法约束。
6. **加模块清单必须含"新表 register 或 whitelist"一步**(否则 dev 撞启动失败会懵)。
7. 前端资源级覆盖矩阵 UI 降级(拆 `RoleDataPermissionEditor` resources 区 + schema,P2 前端返工项)。

## 8. 权限码与工程护栏

### 8.1 权限码单一真相源与三方闭环(v3 重写,消解 v2 的方向对撞)

- **声明源(唯一)**:前端路由 `staticData`(页面级 `permission` + 按钮级 `actions`)。manifest `menuSeed` 的 action/menu 节点**只引用**staticData 已声明的码,不新增(CI 校验两处一致,消解现存 15 码重叠 + 各自独占的发散)。
- **单向生成**:staticData(权限码目录)+ menuSeed(菜单结构)→ 生成后端菜单/权限 seed。
- **消费校验**:后端 `@RequirePermission` → OpenAPI **真 `x-permissions` 扩展**(修 §1.1 缺陷 #1)→ CI diff:后端消费集 ⊆ 前端声明集,seed 表 = 前端声明集。**不反向生成前端权限类型**(v2 §8.2 的"替换手写权限表"删除——与 CLAUDE.md "staticData 是刻意保留的设计资产"冲突)。

### 8.2 其余护栏

继承:ArchUnit 规则集(按新结构改写 + §3.1 三条净新增)、OpenAPI 快照 + drift CI、oasdiff breaking-change 门禁、enforcer/flatten、OpenSpec 工作流、TDD 纪律、ADR 文化。
新增:fail-closed 启动校验(§7)、双向契约测试(零翻译直连,§5.6)、seed 管线(§8.1)、env 一致性守卫(前端恢复 `check:env`,后端补 `.env.example`——后端目前无,secrets 注入故事是"clone 能跑 vs 泄密"的分界)、文档极简(约束进测试,文档只写 why;顶层 CLAUDE.md 唯一真源,AGENTS.md 生成/软链)。

## 9. 分期路线

| 阶段 | 内容 | 下班信号(DoD) |
|---|---|---|
| **P-1 前置** | 落地当前前端 in-flight 迁移(约 145 文件),工作树收敛全绿 | `pnpm test`/`tsc`/`eslint` 绿,git 干净 |
| **P0 重组与骨架** | git mv 进 frontend/;backend 新骨架(§3 结构)+ 基建精选移植;CI 重写(前端 job working-directory + Maven job);**契约 ADR**(方言/路径/动作词/ID/origin 拓扑);vite proxy 配置;后端 `.env.example`;NEW-PROJECT.md 迁移 + 后端章;顶层 CLAUDE.md | 双侧编译测试全绿,CI 双 job 过,`scripts/dev.sh` 全栈一键起(compose + 后端 + 前端) |
| **P0.5 ID/编号手术(gated)** | §6 全部;DataScope 类型改造单独对抗 re-review | `mvn verify` 绿 + 既有数据权限矩阵(UUID 化)绿 |
| **P1 认证 + Shell 基线** | 双 token(去 JWT)+ client 层重构(§5 全部工作项,含 mock 改形/Accept-Language/traceId)+ `/me` + menus/subsystems 域 + **最小菜单/权限手写 seed(Shell 渲染的物理前提,自动化生成器留 P2)** | 前端关 mock:登录进 Shell,导航渲染,错误 toast 带 traceId |
| **P2 IAM + 权限闭环** | users/depts/roles + permissions/tree + 角色功能/数据权限(角色级)+ x-permissions + seed 生成器 + 三方 diff + **会话内权限刷新** + fail-closed 启动校验 + 前端资源级矩阵降级 | IAM 三页可用;越权矩阵绿;seed 自动生成;改权限不重登即生效 |
| **P3 长尾域** | messages/files/dictionaries/audit/profile/company/dashboard + 极简邮件 + SMS 限流 | 全平台页关 mock 可用 |
| **P4 业务样板** | lastmile 前后端成对 + **重写加模块清单**(二轮 A7:12 步清单焊死 29 模块结构,是重写不是校准) | 照新清单从零加一个域全程走通 |

每阶段完成做 review;P0.5 与 P2 数据权限执行前再做对抗性 review。admin 模块跨 P1-P3 分域建成(非原子交付,计划期按域拆任务)。

## 10. 对 Codex 建议的裁定(更新至 v3)

| Codex 建议 | 裁定 |
|---|---|
| 精选继承重新定基线 | ✅ 采纳 |
| 模块压缩 | ✅ 采纳,进一步演化为与前端子系统对齐(§3);权衡加重见 §3.1 |
| x-permissions 补真 + 三方差集 | ✅ 采纳(方向按 §8.1 定为单向) |
| OpenAPI 唯一 wire contract 生成 TS+Zod | ❌ 拒绝:zod 手写保留(功能语义甲方 + 表单共用),契约测试事后校验;但传输方言统一后契约测试零翻译 |
| 会话 authorizationVersion | ✅ 采纳变体:会话内权限刷新(比 kickout 更温和,原语现成) |
| 去 JWT+Redis 双重状态 | ✅ 采纳 |
| 换 Spring Security | ❌ 拒绝(ADR-0005 未被推翻;门面已隔离) |
| 删 tenant_id | ✅ 采纳 |
| S3/SBOM/生成器 | ⏸ pre-prod / 派生 2-3 个后再说 |
| oasdiff | ✅ 采纳 |

## 11. 风险与遗留

- P-1 是硬前置;ID 手术是多日安全敏感重构(P0.5 冻结业务改动);client 层重构改变全部请求行为,错误路径回归覆盖。
- mock 改形(113 处调用点校对)与 client 重构必须同批,否则开发态断档。
- pre-prod 清单:refresh 重放入侵检测(kickoutAll)、S3 adapter、SBOM、HSTS、密码历史/过期、审计防篡改、生产 Dockerfile/nginx/优雅停机、CI path filter(前端 PR 免跑 Maven)。
- meta-build ADR 择要(0003/0004/0005/0007/0008/meta-0023)与规则库精华迁入 docs/。

## 12. 非目标(v1 明确不做)

Spec 引擎/AI 循环引擎;多租户;资源级数据权限与共享规则(路径已预留);SSO/LDAP/OIDC、2FA;消息队列、微服务;SSE/WebSocket(消息中心轮询);可配置项目生成器;生产容器化与部署编排(pre-prod);备份恢复/容量规划(派生项目自管);许可证扫描(真开源再做);审计防篡改。

## 13. 参考

- meta-build 原仓:`/Users/ocean/Studio/01-workshop/02-软件开发/06-meta-build`
- 前端契约真相源:`src/modules/*/api/schema.ts`、`src/mocks/`、`src/lib/http/client.ts`、`src/config/request.ts`
- 数据权限调研附件:`2026-07-10-data-permission-research-annex.md`
- 关键证据索引:`client.ts:104`(非 2xx 早抛)/`Shell.tsx:18-19`(Shell 依赖 menus 域)/`DataScopeExecuteListener.java:39-59,74+`(fail-open + Long cast)/`SaTokenCurrentUser.java:41,61-67`(getLoginIdAsLong + session 权限快照)/`AuthService.refresh():161-199`(会话刷新原语)/`AuthService.java:73-88`(爆破防护耦合 captcha)/`PermissionOperationCustomizer.java:22`/`SaTokenJwtConfig.java:28`/`src/mocks/http.ts:5`(biz helper)/`I18nAutoConfiguration.java:28-60`/`manifest.ts:86-95` vs `routes/_auth/admin/*.tsx`(权限码双源发散)
