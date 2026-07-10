# 数据权限成熟方案调研附件(MetaBuilder 后端设计 §7 的依据)

> 日期:2026-07-10。调研范围:RuoYi、Salesforce 共享模型、PostgreSQL RLS、Casbin、OPA、ABP、Odoo。
> 主文档:`2026-07-10-metabuilder-monorepo-backend-design.md`

## 核心结论

1. **决定性设计轴是 opt-in vs opt-out,不是选哪家模型**。RuoYi `@DataScope` 是 opt-in(忘加注解=数据裸奔,公认头号坑,另有历史 `${params.dataScope}` SQL 注入);Salesforce OWD / ABP IDataFilter / Odoo ir.rule / EF Core 全局过滤器全是 opt-out(默认过滤,显式关闭才放开)。
2. **资源级差异化在业界普遍,但形态是"策略挂资源"**(Salesforce 每对象一个 OWD、Odoo 每模型一条 rule、ABP 每实体一个 filter),**不是**"角色持有 per-resource scope 矩阵"(R×K 格子,漏填即盲区,罕见反模式)。若做资源差异化,配置入口放资源注册侧,不放角色配置侧。
3. **"业务员看自己 + 领导看本部门"= 角色级 scope 的 self/dept 两档**,所有方案下均不需要资源级。Salesforce 甚至零规则:OWD Private + 角色层级自动上卷。
4. **多角色必须编译为可表达并集的运行态策略**。`SELF`、`OWN_DEPT(_AND_BELOW)`、`CUSTOM_DEPT` 之间是 OR 并集，`ALL` 才短路；用 enum ordinal/优先级只选一个 scope 会静默丢权限。推荐运行态模型为 `DataScopePolicy(all, includeSelf, deptIds)`，而不是在 session 保存单个 `DataScopeType`。
5. **PG RLS 不做主力**:表 owner 默认绕过(不加 FORCE 形同虚设)、逐行求值性能退化、SQL 表达不了外部上下文、难测难 CI。正确定位是防御纵深兜底,应用层过滤是主流。
6. **升级路径**(同一 jOOQ Listener 拦截点内):v1 角色级 + fail-closed → v2 资源默认策略 → v3 共享规则(例外放开)→ v4 策略引擎(OPA partial evaluation)。触发信号:同一角色 ≥2 资源确需不同 scope / 跨部门条件共享 / 非部门维度隔离 / 外部上下文参与判定。

## 方案对比

| 方案 | 模型本质 | 拦截点 | 默认安全性 | 复杂度 |
|---|---|---|---|---|
| RuoYi @DataScope | 角色级 5 型 scope,多角色并集 | Service AOP 拼 SQL 片段 | ❌ opt-in | 低 |
| meta-build(jOOQ Listener) | 角色级 5 型,登录展开 deptIds | jOOQ ExecuteListener 对注册表注入 | ⚠️ 表级 opt-out,未注册静默放行 | 低 |
| Salesforce | OWD(按对象)+ 角色层级 + 共享规则 | 平台内建 | ✅ opt-out,只放开不收紧 | 高 |
| PostgreSQL RLS | 表上 POLICY 行过滤 | 数据库内核 | ✅ 但 owner 默认绕过 | 中 |
| Casbin | 策略引擎,反查后自拼条件 | 应用层(不生成 WHERE) | 取决于接法 | 中高 |
| OPA | Rego 偏求值编译成 WHERE | 应用层 compile API | 取决于接法 | 高 |
| ABP IDataFilter | 实体接口标记 + EF 全局过滤器 | ORM 层 | ✅ opt-out | 中 |
| Odoo ir.rule | 按模型 domain;全局交集/组并集 | ORM 层 | ✅ opt-out | 中 |

## 关键来源

- RuoYi @DataScope 原理与痛点:https://doc.ruoyi.vip/ruoyi/document/htsc.html ;https://blog.csdn.net/weixin_43860634/article/details/126119195(忘加注解不生效);https://www.cnblogs.com/backlion/p/18896463(历史注入漏洞);https://github.com/yangzongzhuan/RuoYi/issues/273
- ruoyi-vue-pro 规则引擎演进:https://doc.iocoder.cn/data-permission/
- Salesforce 共享模型:https://developer.salesforce.com/blogs/developer-relations/2017/04/salesforce-data-security-model-explained-visually ;https://help.salesforce.com/s/articleView?id=platform.sharing_model_fields.htm
- PG RLS 局限:https://www.bytebase.com/blog/postgres-row-level-security-limitations-and-alternatives/ ;https://planetscale.com/blog/rls-sounds-great-until-it-isnt ;https://www.postgresql.org/docs/current/ddl-rowsecurity.html(FORCE)
- Casbin 数据过滤边界:https://www.casbin.org/docs/data-permissions/
- OPA partial evaluation:https://www.openpolicyagent.org/docs/filtering/partial-evaluation ;https://github.com/open-policy-agent/opa/issues/830
- ABP IDataFilter:https://abp.io/docs/latest/framework/infrastructure/data-filtering
- Odoo ir.rule:https://odoo-development.readthedocs.io/en/latest/odoo/models/ir.rule.html
- EF Core 全局过滤器(opt-out 主流佐证):https://learn.microsoft.com/en-us/ef/core/querying/filters
