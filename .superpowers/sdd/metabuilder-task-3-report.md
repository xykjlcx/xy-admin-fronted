# MetaBuilder Task 3 实现报告

## 状态

- 结论：PASS
- 分支：`codex/metabuilder-fullstack`
- BASE：`2d03f848b6955fed48701fd2a00b7d08e199ca40`
- 原子提交：`实现双 Flyway history 与双 jOOQ schema`（本报告与实现同一提交，最终 hash 见任务回传；Git 对象无法在自身内容中自包含最终 hash）
- 用户的 8 个 `src/**` 脏文件：未编辑、未暂存、未提交

## 交付契约

| Owner | Flyway location | History table | Migration | jOOQ include | Generated package |
|---|---|---|---|---|---|
| platform | `classpath:db/migration/platform` | `flyway_platform_history` | 独立 `V1` | `^mb_.*$` | `com.metabuild.schema.platform` |
| lastmile | `classpath:db/migration/lastmile` | `flyway_lastmile_history` | 独立 `V1` | `^biz_.*$` | `com.metabuild.schema.lastmile` |

- 未使用默认 `flyway_schema_history`。
- `PlatformFlywayRunner` 与 `LastmileFlywayRunner` 是两个 plain Java runner；Spring bean 装配留给 Task 5。
- 组合迁移测试固定 platform 先、lastmile 后。
- lastmile 在 platform 已使 `public` schema 非空时，用 `baselineOnMigrate(true)` + baseline version `0` 创建自己的 history，然后正常执行 lastmile `V1`。
- lastmile 只在 active-by-default 的 `schema-integration-tests` profile 中以 test scope 依赖 platform；`codegen` profile 显式启用时该默认 profile 自动关闭，生产/runtime artifact 无 `schema-platform` 依赖。

## 工具链

- Java：21
- jOOQ：`3.19.24`
- Flyway：`11.7.2`
- PostgreSQL driver：`42.7.7`
- Testcontainers：`1.21.4`
- PostgreSQL image：`postgres:16-alpine`
- generated annotation：`generatedAnnotationDate=false` 且 `generatedAnnotationJooqVersion=false`；生成源码内无 `date =` 和 `jOOQ version:`。

## TDD 证据

### RED 1：platform 契约

命令：

```bash
JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home \
  backend/mvnw -f backend/pom.xml -pl schema-platform,schema-lastmile -am verify
```

实际结果：

- `PlatformSchemaIntegrationTest` 3 项中 2 项失败：`PlatformFlywayRunner` 缺失。
- `PlatformSchemaConfigurationTest` 2 项全失败：codegen 配置与 generated sources 缺失。
- `rejectsDuplicateVersionsInsideAnIsolatedPlatformFixture` 通过：Flyway 真实拒绝同 owner 的两个 `V1`。
- 汇总：5 tests，4 failures，0 errors；失败原因与缺失能力一致。

### RED 2：lastmile 契约

命令：

```bash
JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home \
  backend/mvnw -f backend/pom.xml -pl schema-lastmile -am test \
  -Dtest='Lastmile*' -Dsurefire.failIfNoSpecifiedTests=false
```

实际结果：

- `LastmileSchemaIntegrationTest` 3 项中 2 项失败：platform/lastmile runner 缺失。
- `LastmileSchemaConfigurationTest` 2 项全失败：codegen 配置与 generated sources 缺失。
- `rejectsDuplicateVersionsInsideAnIsolatedLastmileFixture` 通过：Flyway 真实拒绝同 owner 的两个 `V1`。
- 汇总：5 tests，4 failures，0 errors；失败原因与缺失能力一致。

### RED 3：双 history 非空 schema 边界

首版 runner 后再跑真实组合测试，platform 3/3 通过，lastmile 2 项失败：

```text
Found non-empty schema(s) "public" but no schema history table.
```

原因是 platform 已建表，但 lastmile 尚无自己的 history。最小修复是仅给 lastmile 配置 version 0 baseline，当次测试随后 6/6 通过。

### GREEN 1：真实迁移链

```bash
JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home \
  backend/mvnw -f backend/pom.xml -pl schema-platform,schema-lastmile -am test \
  -Dtest='PlatformSchemaIntegrationTest,LastmileSchemaIntegrationTest' \
  -Dsurefire.failIfNoSpecifiedTests=false
```

结果：6/6 通过。覆盖 platform-only fresh DB、platform → lastmile fresh DB、两次重复 validate、两个 owner 的 duplicate version 隔离 fixture、两张 owner history 和默认 history 不存在。

### GREEN 2：Task 3 指定验证

```bash
JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home \
  backend/mvnw -f backend/pom.xml -pl schema-platform,schema-lastmile -am verify
```

结果：BUILD SUCCESS，platform 5/5，lastmile 5/5。

### GREEN 3：admin/platform 隔离选择

```bash
JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home \
  backend/mvnw -f backend/pom.xml -pl modules/admin -am verify
```

结果：BUILD SUCCESS，Reactor 只含 parent/shared-kernel/admin-api/schema-platform/admin，不加载 schema-lastmile 或 lastmile module。

### GREEN 4：全 backend 回归

```bash
JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home \
  backend/mvnw -f backend/pom.xml verify
```

结果：10 个 reactor project 全部 SUCCESS；现有与新增共 29 tests 全绿。

## Codegen 与可重现检查

命令：

```bash
JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home \
  backend/mvnw -f backend/pom.xml -Pcodegen \
  -pl schema-platform,schema-lastmile -am generate-sources
```

实际证据：

- 两个模块都启动 `postgres:16-alpine`，先用各自 Flyway location 迁移，再由 jOOQ `3.19.24` 反向生成。
- platform 日志显示 `includes: [^mb_.*$]`、target package `com.metabuild.schema.platform`。
- lastmile 日志显示 `includes: [^biz_.*$]`、target package `com.metabuild.schema.lastmile`。
- 在 generated sources 已存在时再跑，两边均显示 `Modified files: 0` 和 `No modified files`，证明无日期/版本漂移。
- 每个 owner 生成 6 个 Java 文件，已纳入 Task 3 提交。

runtime 边界补充检查：

```bash
JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home \
  backend/mvnw -q -f backend/pom.xml -Pcodegen -pl schema-lastmile \
  dependency:tree -Dscope=runtime \
  -Dincludes=com.metabuilder:metabuilder-schema-platform -DoutputType=text
```

结果无任何 platform 依赖输出。

## 文件

- 版本/依赖管理：`backend/pom.xml`
- platform：`backend/schema-platform/pom.xml`、runner、`V1` migration、6 个 generated Java sources、2 个测试类、2 个 duplicate-version fixture
- lastmile：`backend/schema-lastmile/pom.xml`、runner、`V1` migration、6 个 generated Java sources、2 个测试类、2 个 duplicate-version fixture
- 证据：`.superpowers/sdd/metabuilder-task-3-report.md`

## 自审

### Spec compliance

- PASS：两个 owner location/history/version 序列物理分离。
- PASS：platform 先、lastmile 后由真实 PostgreSQL 组合测试证明。
- PASS：无 `flyway_schema_history`，无 `(mb_|biz_).*` 聚合生成。
- PASS：generated package/include 单 owner，反向引用由守卫测试阻断。
- PASS：generated sources 入 Git，annotation 无日期/版本漂移。
- PASS：lastmile 生产/runtime 无 schema-platform 依赖。
- PASS：admin/platform 独立 reactor selection 不加载 lastmile。
- PASS：用户 8 个 `src/**` 文件未触碰。

### Code quality

- runner 只包含 owner 固定配置与 `migrate/validate` 入口，未提前引入 Spring。
- 测试使用真实 Testcontainers PostgreSQL 和 Flyway，无 mock。
- duplicate version 使用独立 classpath location 和独立 history table，不污染主 migration。
- 生成边界同时检查 POM 配置和实际 generated source，不只看字符串配置。
- `git diff --check -- backend` 通过。

## Concerns / 后续边界

- Task 3 只交付 plain runner；app 内的显式 Spring bean 与 bean 顺序属于 Task 5，不在本任务提前装配。
- lastmile baseline 固定为 version `0`；后续不得把 baseline 提高到业务 migration 版本，否则会跳过独立序列。
- 本次 `V1` 是 P0a 最小 schema probe；Task 11 应以新版本追加 IAM migration，不应回改已提交的 `V1`。
- codegen 容器由 Testcontainers Ryuk 在 Maven JVM 退出时清理；未使用会在 Maven 插件 classloader 卸载后失效的 Groovy shutdown hook。
