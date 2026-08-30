# 后端架构定案：banking-vsa（TypeScript / VSA）

> 状态：**已拍板**（2026-08-30，洋哥）
> 效力：本仓库后端唯一路线为 `banking-vsa/`（垂直切片架构）；MetaBuilder Java 线（`2026-07-11-metabuilder-fullstack-implementation.md`）Task 21–29 **终止**，已完成的 Task 1–20 作为执行记录保留，不再续作。
> 本文是决策档案：记录决策、备选、调研依据、打分矩阵、以及**铺开切片前必须完成的修订清单**。

## 1. 决策

后端采用 banking-vsa 已验证的形态：

- **技术栈**：Node 22 + Hono + `@hono/zod-openapi` + Zod v4 + Drizzle + PostgreSQL（PGlite 零依赖开发模式）+ JWT 双 token
- **架构**：`src/modules/<key>/{slices/, domain/, api.ts}` + `src/platform/`（db/http/openapi/security/events 内核）
- **切片**：一个用例 = 一个文件，三段式（zod 契约 → createRoute 路由声明 → 线性事务脚本）；本决策将其扩为**四段式**（见 §5.1）
- **边界**：ESLint boundaries 机器强制（切片互不 import；跨模块只走对方 `api.ts`；platform 禁止依赖 modules）
- **契约**：`openapi.json` → `openapi-typescript` 生成前端类型，替代前端手写第二份 zod（CI 卡生成产物 diff）
- **仓库形态**：banking-vsa 迁入主仓与 `frontend/` 并排（全栈一体交付，对标 RuoYi 的交付故事）——迁入动作在 MVP 阶段执行

## 2. 被否路线与理由

| 路线 | 否决理由（证据见 §3） |
|---|---|
| MetaBuilder Java 线续作 | 单人 + AI 形态下双语言栈维护成本翻倍；TS 试点已全绿；沉没成本不绑架路线 |
| 传统 Express 分层（RuoYi/先锋式） | 先锋项目 253k 行实证：三层同名镜像、33/95 controller 绕层裸 SQL、2152 端点仅 3 模块有校验、schema 真源是 11,769 行命令式 JS |
| NestJS 企业分层 | 上帝 service 是结构性必然（Twenty 1179 行 / Immich 1164 行 / n8n 245KB 全中）；n8n（203k star）用 274 行自研替掉它，Immich（113k star）把 module 体系精简到 1 个文件——两个最大样本实质退出其核心抽象 |
| tRPC 全栈一体 | 三家没有一家用 tRPC 解决对外 API（Cal.com 另起 NestJS；Documenso 46KB 重复实现后废弃）；我们前端是独立 SPA，端到端推断的收益本来就吃不到 |
| Config 驱动（Payload/Strapi） | 纯 CRUD 场景真王者，但天花板硬（Payload 自己撞墙退回手写 endpoint）；B 端主体（审批/对账/状态流转/批量导入）恰在天花板之上 |
| 重模块化（Medusa v2） | 为"模块可插拔"付的税（Link 表、跨模块内存 join、19 条 lint 管住的 workflow DSL）在单库单团队场景全是浪费。**判据存档：模块隔离强度由"是否需要被独立替换"决定，不由"看起来整洁"决定** |

## 3. 调研依据（2026-08-30，九项目三阵营源码实读）

样本：Cal.com 48k / Dub 24.6k / Documenso 14.8k（tRPC 全栈派）；Medusa 36k / Payload 44.5k / Strapi 73k（模块化产品派）；Twenty 55.9k / Immich 113k / n8n 202.9k（NestJS 企业派）。全部经 GitHub API 实读真实目录树与源文件；另含先锋项目（Express 传统分层，253k 行）本地解剖。

三条跨阵营收敛结论：

1. **"一个用例一个文件"是行业收敛解**。tRPC 三家在不同框架下独立演化出该粒度；NestJS 三家因缺它全部长出上帝 service，且 n8n 证明**换纵切目录不换粒度救不了**（245KB 巨石就长在新 `modules/` 里）——病根是"一个类聚合一个实体的全部用例 + DI 加依赖零摩擦"。
2. **OpenAPI 绕不开**。tRPC 三家全部二次交税补 OpenAPI；n8n Public API 维护 220 个手写 YAML；Dub 在同一 monorepo 内仍出现"一条 Link 三个互不校验的真相源"——**同仓不自动带来类型安全，必须靠生成 + CI 卡**。
3. **机器强制边界是全行业稀缺品，预防远优于补救**。tRPC 三家零强制（lib 大杂烩）；n8n 事后补 31 条规则 + 一个内容仅为 `{"issues": 169}` 的 baseline——技术债制度化成一个数字。同时 Immich 警示：结构简单是第一道防线，守卫不是复杂度的许可证。

另：没有一家把"事务边界 = 用例边界"做对（Twenty 一个 util / Immich 锁进 repository / n8n 三套并存）；VSA 切片显式事务天然做对，此为结构性优势。

## 4. 打分矩阵（场景锚定：B 端脚手架 + 单人 + AI 代理 + 量产派生）

| 维度（权重） | 传统分层 | NestJS | tRPC | Config 驱动 | DDD 战术 | Medusa | **VSA** |
|---|---|---|---|---|---|---|---|
| CRUD 成本 (10) | 8 | 5 | 8 | **10** | 3 | 4 | 6¹ |
| 复杂业务天花板 (10) | 7 | 7 | 7 | 3 | **10** | 8 | 9 |
| 改动局部性 (12) | 3 | 4 | 6 | 8 | 3 | 4 | **9** |
| 纪律可机器强制 (10) | 2 | 5 | 3 | 6 | 4 | **9** | 8 |
| 契约与类型安全 (12) | 2 | 6 | 6 | 7 | 6 | 5 | **9** |
| 长期熵增抗性 (15) | 2 | 4 | 4 | 6 | 7 | 7 | **8**² |
| 上手成本 (8) | **9** | 5 | 7 | **9** | 2 | 3 | 8 |
| 生态成熟度 (8) | **10** | 9 | 7 | 7 | 5 | 6 | 6 |
| AI 代理友好度 (15) | 4 | 4 | 6 | 5 | 3 | 2 | **9** |
| **加权总分** | 4.7 | 5.2 | 5.9 | 6.6 | 4.8 | 5.3 | **8.1** |

¹ 补 stub 生成器后升至 8。² 全表证据等级最低的一格：推演 + 20 切片试点，无 10 万行长跑实证。

敏感性：AI 友好权重归零 → VSA 8.0 仍居首（领先靠硬指标非 AI 情怀分）；"10 人团队 + 招聘优先"场景 → NestJS ~6.2 vs VSA ~7.6，排序不变；"纯 CRUD 工具"场景 → Config 驱动 7.4 逼近 VSA 7.8——**那类项目不该用本脚手架，直接上低代码**。VSA 价值区间 = 有真实业务逻辑的 B 端系统。

注：DDD 的**战略设计**（限界上下文 / 按业务能力划分 / 通用语言）已被 VSA 全盘继承（module 划分即限界上下文，`domain/*-rules.ts` 即领域规则轻量表达）；4.8 分否掉的只是战术全家桶的仪式成本。**VSA = DDD 战略 + 事务脚本战术。**

## 5. 铺开切片前必补清单（按优先级；n8n 的 169 号 baseline 是"事后补"的下场）

### 5.1 漏洞级（不补就是安全/一致性缺陷）

1. **切片三段式 → 四段式**：契约 → 路由（权限位）→ **资源归属 / 数据范围断言** → 事务脚本。中间件只回答"有没有这类权限"，回答不了"这条记录是不是你的"——缺位即静默越权。豁免必须显式（`// no-ownership-check: <理由>`）。
2. **DataPolicy：access 返回 `true | false | Where`**（抄 Payload `executeAccess`）。行级数据权限（本人/本部门/本租户）一次声明，platform 层注入 find/get/update/delete/count 全部查询路径；切片只声明策略名。落点：banking-vsa 生产地基设计 §8 的 DataPolicy 地基——**从"推迟"改判为"必上"**。
3. **事件总线补 outbox + 重试**：事件随业务同事务落库，独立 worker 投递重试。不上 saga/编排器（单库不需要）。同为生产地基设计中"从推迟改判必上"的一件。

### 5.2 机制级（守卫与可审查性）

4. **fail-closed 权限 lint**（抄 Twenty `createGuardedEndpointRule`）：路由缺权限声明直接 lint 报错，公开接口必须显式标注。漏挂从"静默放行"变"编译不过"。
5. **切片行数上限 lint**（约 300 行）+ **堵 `eslint-disable` 绕过边界规则**（抄 n8n `no-misplaced-*-disable`）。对冲"纪律终会失守"。
6. **SQL 快照测试**（对标 Immich `@GenerateSql`）：切片查询经 Drizzle `.toSQL()` 转储入库，SQL 成为可 diff 的 PR 产物。
7. **契约管道 CI 卡**：`openapi.json` 与 `openapi-typescript` 生成产物有 diff 即 fail。
8. **错误 schema 进契约**（抄 Dub）：RFC7807 定义为 zod schema 展开进每个 route 的 responses；错误码自动推导 `doc_url` 文档锚点。

### 5.3 效率与规范级

9. **stub 生成器**（抄 Strapi 三行模板哲学）：派生新业务域生成最小委托 stub，定制时就地展开为标准切片。回答"CRUD 杠杆产品化"。
10. **RouteCaller 提取**（抄 Documenso）：handler 只解包 ctx，逻辑为入参显式的可导出函数，供 job/测试/切片直调。
11. **字段级 `.describe()` + 信任标注**（抄 Documenso）：zod 字段描述直接成 OpenAPI 文档；类型注释标 `/** Verified */` vs `/** Unverified */`。
12. **权限点两端对账**：后端路由权限码 ⇄ 前端 `staticData.actions` 互 diff 出权限变更集。
13. **跨模块 join 纪律明文化**：单库前提下，只读列表查询允许跨模块 join；写操作必须走对方 `api.ts`。防止手工复现 Medusa 内存 join。
14. **PGlite 能力边界记档**：引入任何 PG 原生特性（触发器/自定义函数/扩展）前先跑 PGlite 验证，不假设等价。

生产地基设计中**继续推迟**的部分：Use Case Executor 统一执行内核、乐观并发、幂等重试——真实项目撞到需求再上。

## 6. 证据等级声明

- 九项目结论均为**静态源码实读**（目录树全量拉取、关键文件实读、断言带路径），未运行任何样本；涉运行时性能的判断（如 Medusa residual filter 内存开销）依据其源码注释自陈，未压测。
- n8n 细节部分由二级子代理调研，四条关键断言（零 nest 依赖 / 245KB 巨石 / 169 边界违规 / 99 code-health 违规）已独立复核属实，其余（31 条 lint 清单、193 个 DTO、三套事务写法）**未逐条复核**。
- 先锋项目解剖为本地源码实读（含踩坑库 424 篇交叉引用）。
- banking-vsa 自身状态：20 切片 / 100 测试全绿 / 三轮对抗 review（2026-07-12~14）；**无生产长跑实证**——长期熵增抗性分数据此保守。

## 7. 后续里程碑（MVP 链路，2026-08-30 起）

1. 按 §5.1–5.2 修订 banking-vsa 的切片模板、CLAUDE.md 与守卫（**在写新切片之前**）
2. banking-vsa 迁入主仓（`backend/` 与 `frontend/` 并排），一键全栈启动
3. openapi → 前端类型管道打通，删前端手写第二份 zod（前端 Task 25"契约总账"的实现路径）
4. 按前端已有页面倒排补切片（logout / dept / subsystems / 数据权限 / 审计日志——vsa-ts-report §7 缺口清单）
5. stub 生成器 + 派生脚本；用一个真实业务项目做首次派生验收（派生 + 回流纪律，防 fork-and-forget）
