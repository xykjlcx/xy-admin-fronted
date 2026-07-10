# MetaBuilder 全栈脚手架:后端抽离与 monorepo 重组设计

> 日期:2026-07-10
> 状态:待对抗性 review + 洋哥审阅
> 来源:基于 meta-build(`/Users/ocean/Studio/01-workshop/02-软件开发/06-meta-build`)server 侧抽离,配套本前端脚手架

## 1. 背景与目标

本前端脚手架(Vite + React + TanStack + shadcn/ui)目前只有 MSW mock,没有真后端。meta-build 项目已有一个接近完工、工程质量高的 Java 后端(Spring Boot 3.5 + Java 21 + jOOQ + PostgreSQL 16 + Flyway + Sa-Token + Redis,六层 Maven 模块化单体,19 条 ArchUnit 规则,199 个集成测试,几乎零烂尾),但它的对外契约是为 meta-build 自己的前端(已被本脚手架取代)设计的。

**目标**:把 meta-build server 抽离为本前端脚手架的配套后端,组成 MetaBuilder 全栈 monorepo;站在 meta-build 的教训上做得更好,而不是简单复制。

## 2. 已定决策

| 决策项 | 结论 | 理由 |
|---|---|---|
| 形态定位 | **配套后端范本**:前端契约是唯一甲方 | meta-build 的死法之一是底座野心导致样本永远补不齐;配套定位给出清晰边界和下班信号 |
| 仓库形态 | **monorepo**:`frontend/` + `backend/` 两个顶层目录,在现前端仓原地重组 | 洋哥明确要求;原地重组保住前端 git 历史 |
| 命名 | 系统叫 **MetaBuilder**;包名 `com.metabuild.*`、表前缀 `mb_` 保留 | 零重命名成本,血统延续 |
| 认证 | **双 token**(access + refresh rotation),前端补 401→静默刷新→重放拦截器 | 后端资产已有 rotation 实现;B 端标准体验 |
| ID 设计 | **所有表 ID 为 string 类型(UUIDv7,PG 原生 `uuid` 列)**;业务主档表另配人类可读编号字段 | 洋哥定;抽离时一次做掉最便宜 |
| 数据权限 | v1 **角色级 5 型 scope + fail-closed 注入**;资源级差异化不做,升级路径预留 | 调研结论(见 §7);两个已知真实场景(业务员看自己/领导看本部门)角色级即覆盖 |

## 3. 总体形态

```
MetaBuilder/                     ← 现「通用脚手架前端」仓库原地重组
├── frontend/                    ← 现前端代码整体迁入(src/e2e/scripts/package.json/vite 配置等)
├── backend/                     ← meta-build server 六层 Maven 抽离改造
│   ├── mb-common / mb-schema / mb-infra / mb-platform / mb-business / mb-admin
│   ├── api-contract/            ← OpenAPI 快照基线(git diff 防 drift)
│   └── scripts/
├── docs/                        ← 原型文件(后台管理脚手架.dc.html)、架构文档、specs/plans、ADR、规则库
└── CLAUDE.md                    ← 顶层 AI 契约(索引式);frontend/、backend/ 各有分册
```

- backend 拷代码不带 meta-build git 历史;新仓首个 ADR 记录血统、决策继承(哪些 meta-build ADR 仍有效)。meta-build 原仓保留作参考档案,不删。
- **重组前置条件**:前端工作树当前有大量未提交改动,必须先收敛提交,再做 `git mv` 重组。
- **前端契约是甲方**:各域 `api/schema.ts` 的 zod schema 就是后端接口规格书。每个域的完成定义(DoD)= 前端关 mock(`VITE_ENABLE_MOCK=false` + `VITE_API_BASE_URL`)真连后端,页面业务可用。

## 4. backend 抽离与裁剪

### 4.1 直接保留(硬资产)

- 六层 Maven 结构与依赖方向:`mb-common → mb-schema → mb-infra → mb-platform → mb-business → mb-admin`
- `CurrentUser` / `AuthFacade` 双门面(接口在 mb-common,Sa-Token 实现锁在 infra-security)
- `DataScopeExecuteListener` 数据权限单点拦截 + `DataScopeRegistry` + `@BypassDataScope`(v1 升级为 fail-closed,见 §7)
- mb-schema 契约层:Flyway + jOOQ codegen 三插件流水线(Testcontainers 起真 PG → Flyway 建表 → jOOQ 反向工程),生成物入 git
- ProblemDetail(RFC 9457)错误契约 + `PageRequestDto/PaginationPolicy/PageQuery` 三段式分页 + `PageResult`
- 缓存纪律(key 级失效 + afterCommit)、`@OperationLog` 切面、ShedLock 定时任务
- 测试基建:Testcontainers 共享容器、`BaseIntegrationTest`、`MockCurrentUser`、`OpenapiSnapshotTest`(OpenAPI 快照 + CI drift 检查)
- ArchUnit 19 个规则类 + maven-enforcer(JDK 21)+ flatten(CI-friendly version)
- infra 子模块:security / cache / jooq / exception / web / i18n / async / rate-limit / observability / archunit

### 4.2 按前端契约改造

| 域 | 改造内容 |
|---|---|
| 菜单/子系统 | **重做**:采用前端模型——`Subsystem`(key/label i18n map/icon/home/enabled/sort)+ `MenuRecord` 三型(dir/menu/action,i18n label map,扁平列表前端组树);砍掉 meta-build 的 route_tree + menu 双树(它服务于已死的前端) |
| 认证 | 保留双 token;补 sms-code/sms-login/qr-login 端点;`/api/auth/me` 返回 `{user, roles, permissions}` 形状对齐;登录失败返回 4xx ProblemDetail(前端登录接口已用 `on401:'reject'` 隔离全局登出) |
| 文件 | file 域加文件夹树(parentId 自引用)、存储配额概览、真 multipart 上传(前端 mock 目前是元数据登记式,对接时前端按 adapter 备忘补上传例外协议) |
| 消息 | notification 域收敛为站内信 + 审批收件箱(messages):category(approval/security/system)、unreadCount、审批 approve/reject 状态机(仅 pending 可审,重复审回冲突) |
| 新增小域 | subsystems、dashboard overview(跨模块聚合,放 mb-admin usecase 层)、profile(安全设置/偏好/登录设备)、company(企业信息) |
| 字典/日志 | dict、log 域形状对齐前端契约(字典 code/value 唯一性、builtin 保护;操作日志/登录日志筛选 + CSV 导出流) |
| IAM | users/depts/roles 对齐前端契约:部门树防环校验、memberCount 子树聚合(排除 left)、成员高级筛选(filters JSON 条件数组)、批量禁用、系统角色保护、角色审计日志 |

### 4.3 裁掉(前端用不到)

SSE(infra-sse)、微信公众号/小程序渠道、邮件模板(Thymeleaf)、captcha、platform-monitor、business-notice、business-exam。

- notice/exam 不搬:业务样板由 **lastmile(尾程快递)** 顶替,与前端现有示例子系统成对;写 lastmile 时可回 meta-build 原仓参考 notice 的全特性实现(状态机/批量/导出/事件)。
- 裁剪 = 不拷入新仓,不是删 meta-build。需要时随时回去取。

## 5. 契约对齐分工

**原则:后端不迁就前端方言。**`R<T>{code,data,message}` 包装是 meta-build 从 nxboot 用血换来的头号 MUST NOT,不捡回来。

| 错位 | 归属 | 做法 |
|---|---|---|
| 响应包装:ProblemDetail + 业务对象直出 vs `{code,data,message}` | 前端 | `src/lib/http/adapter.ts` 单点吸收(这层就是为接真后端设计的):成功直出→包装为 `{code:0,data}`;`application/problem+json` → 映射 `BizError(code,message)` |
| 分页:`PageResult{content,totalElements}` vs `{list,total}`;`size` vs `pageSize` | 前端 | adapter `parseEnvelope` / `mapRequestParams` |
| 401 语义 | 双方 | 后端:业务性登录失败回 401 ProblemDetail(带错误码);前端:登录类接口 `on401:'reject'`(已有),其余 401 先走 refresh 拦截器,刷新失败才广播过期 |
| refresh | 前端 | http client 层新增:401 → 用 refresh token 换新对 → 重放原请求;并发请求共享同一个刷新 Promise(防抱团);refresh 本身失败 → 登出 |
| 错误码 | 后端 | 前端 mock 的 4 位业务码(4000/4001/4004/4040/4090...)映射到 ProblemDetail 的 `code` 扩展字段(点分格式 `<module>.<resource>.<error>`);adapter 负责把 ProblemDetail code 透传给 BizError,前端页面按 code 分支的逻辑改为按语义 code 判断 |
| 文件流例外 | 双方 | CSV 导出/文件下载不走 envelope(前端 mock 已如此约定),multipart 上传按 adapter 备忘走例外协议 |

## 6. ID 与编号设计

1. **所有表主键 ID 为 string 语义**:PG 原生 `uuid` 列 + **UUIDv7**(时间有序,索引不碎;16 字节存储;JSON 天然 string)。应用层生成(PG 16 无原生 uuidv7 函数),`SnowflakeIdGenerator` 退役。
2. **全链路 string**:DDL、jOOQ 生成物、`CurrentUser.userId()` 等门面签名、`created_by/updated_by` 审计字段、Sa-Token loginId、VO/Cmd 全部 String/UUID 类型;前端 zod 契约本来就是 string id,天然对齐。
3. **编号字段(人类可读)**:**业务主档表必备**(用户/部门/角色/订单这类人会指着说话的实体);关联表、日志表、字典项不配。格式 `前缀-日期-日序列`(如 `USR-20260710-0001`),PG sequence 保证并发安全。
4. **守卫**:ArchUnit/守卫测试禁止 `Long` 型 ID 出现在 api 层类型签名中;DDL review 清单含"主档表必有 `no` 列"。
5. **时机**:P0 一次性手术(改 DDL → 重跑 codegen → 全仓类型追改 → 测试全绿),之后不再回头。

## 7. 数据权限设计

调研了 RuoYi、Salesforce 共享模型、PostgreSQL RLS、Casbin、OPA、ABP、Odoo 后的三个关键判断:

1. **决定性设计轴是 opt-in vs opt-out**。RuoYi `@DataScope` 是 opt-in(忘加注解=数据裸奔,业界公认头号坑);Salesforce OWD/ABP IDataFilter/Odoo ir.rule/EF Core 全局过滤器全是 opt-out。meta-build 的表注册机制是半个 opt-out,但"未注册的表静默放行"仍是盲区(meta-build 自己承认差集检测"暂不实现靠 code review")。
2. **资源级差异化在业界普遍,但形态是"策略挂在资源上"**(Salesforce 每对象一个 OWD、Odoo 每模型一条 rule),**不是**前端现在的"角色持有 per-resource scope 矩阵"(罕见反模式:R×K 格子,漏填即盲区,退回 opt-in 老坑)。
3. **已知真实场景(业务员看自己/领导看本部门)= 角色级 scope 的 self 和 dept 两档**,不需要资源级。

### v1 方案

- 角色级 5 型 scope(全部/自定义部门/本部门/本部门及下级/仅本人),登录时展开 deptId 集存 session,jOOQ ExecuteListener 单点注入——沿用 meta-build 架构。
- **fail-closed 升级(超越 meta-build 的第一刀)**:需隔离的表进 `DataScopeRegistry`(注册即默认过滤);明确无需过滤的表(字典/配置/公共资源)进**显式白名单**;**两个名单都不在的表 → 查询拒绝**,绝不静默放行。
- **差集守卫测试**:遍历 jOOQ 生成的表,凡含 `owner_dept_id` 列必须已注册,否则测试失败。
- 前端资源级覆盖配置 UI 降级(隐藏或标二期);角色数据权限接口只接默认 scope。

### 升级路径(同一 Listener 拦截点内,不推翻架构)

v2 资源默认策略(每张注册表带默认 scope,配置入口在资源注册侧而非角色侧)→ v3 共享规则(按条件例外放开,对齐 Salesforce sharing rules)→ v4 策略引擎(OPA partial evaluation,仅当出现 SQL 表达不了的外部上下文)。触发信号写入 pre-prod 清单:同一角色 ≥2 个资源确需不同 scope / 跨部门共享需求 / 非部门维度隔离。

## 8. 工程护栏(继承 + 超越)

**继承**:19 条 ArchUnit 规则、OpenAPI 快照 + `git diff --exit-code` drift CI、enforcer/flatten、12 步新增模块清单、OpenSpec 工作流、TDD 纪律、ADR 文化(翻转决策先写 ADR)。

**超越 meta-build 的五件事**:

1. fail-closed 数据权限(§7)。
2. DataScopeRegistry 差集守卫(meta-build 明说没做的洞)。
3. **双向契约测试**:前端各域 zod contract 直接跑在后端真实响应上(集成测试阶段拉起后端,前端 contract 断言 shape),meta-build 只有单向 OpenAPI 快照。
4. **seed 管线**:前端 `staticData.actions` + manifest `menuSeed` → 生成脚本产出后端权限点/菜单 seed(SQL 或导入接口)。前端刻意保留的设计资产,meta-build 的 route_tree 闭环没做完,这里做完。
5. **文档极简**:meta-build 的 8960 行 specs 不搬(它自己已出现计数级 drift)——约束一律进 ArchUnit/守卫测试(代码即文档),文档只写 why(ADR)+ 索引式 CLAUDE.md;meta-build 规则库(pitfall/playbook)择要迁入 `docs/rules/`。

## 9. 分期路线

| 阶段 | 内容 | 下班信号(DoD) |
|---|---|---|
| **P0 重组与手术** | 前端收敛提交 → git mv 进 frontend/ → backend 拷入裁剪 → ID/编号手术 → 顶层 CLAUDE.md/docs 重组 | 两侧编译、测试、lint 全绿;`mvn verify` + `pnpm test` 通过 |
| **P1 认证与 IAM** | auth 双 token + 前端 refresh 拦截器 + adapter 实做 + users/depts/roles 三域契约对齐 | 前端关 mock:登录、成员与部门、角色页业务可用 |
| **P2 菜单与权限** | 菜单/子系统域重做 + seed 管线 + 数据权限 fail-closed + 差集守卫 | 菜单页可用;权限点/菜单 seed 从前端声明自动生成;越权测试矩阵绿 |
| **P3 长尾域** | messages/files/dict/audit/profile/company/dashboard | 全部平台页关 mock 可用 |
| **P4 业务样板** | lastmile 前后端成对实现 + 12 步清单按新仓校准 | 新业务域范本闭环:照清单从零加一个域全程可走通 |

每阶段完成做一次 review(形态匹配优先),P0 的 ID 手术与 P2 的数据权限属关键不可逆决策,执行前再做对抗性 review。

## 10. 风险与遗留

- **前端未提交改动**:重组前必须收敛,否则 git mv 与业务改动混在一起无法归因。
- **ID 手术工程量**:全仓 DDL + codegen + 类型追改一次到位,P0 期间冻结业务逻辑改动。
- **refresh 重放入侵检测未实现**(已核实:`RefreshTokenService` 是 one-time use + rotation,重放仅得 401,无 kickoutAll/告警):v1 接受,登记 pre-prod 清单。
- **meta-build 文档不搬 ≠ 经验丢失**:ADR 择要(0003/0004/0005/0007/0008/meta-0023 等)与规则库精华迁入新仓 docs/。
- **契约错位的残留风险**:前端 mock 的业务码分支(如 4004/4090)散在页面逻辑里,adapter 映射后需逐页回归——P1~P3 每域联调时覆盖。

## 11. 非目标(v1 明确不做)

- Spec 引擎 / AI 循环引擎(meta-0023 教训,是不是的拷问没过)
- 多租户完整路由(保留 `tenant_id` 字段)
- 资源级数据权限、共享规则(升级路径已预留)
- SSO/LDAP/OIDC、2FA
- 消息队列、微服务拆分、读写分离
- SSE/WebSocket 实时推送(消息中心 v1 轮询)

## 12. 参考

- meta-build 原仓:`/Users/ocean/Studio/01-workshop/02-软件开发/06-meta-build`(server 代码、ADR 26 份、规则库、notice 全特性样板)
- 前端契约真相源:`frontend/src/modules/*/api/schema.ts`(zod)、`src/mocks/`、`src/lib/http/adapter.ts`、`src/config/request.ts`
- 数据权限调研结论与来源链接:见本次会话调研报告(RuoYi 文档/Salesforce 官方/PG RLS 局限/OPA partial evaluation/ABP IDataFilter/Odoo ir.rule)
