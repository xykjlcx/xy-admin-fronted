# MetaBuilder Task 4 实施报告

## 结论

状态：`SUCCESS`。

`infrastructure` 已建立 Spring Boot 3.5.3 Web 基线，统一输出 `application/problem+json` ProblemDetail，并完成 trace、i18n、安全响应头与 json/void/blob 集成 fixture。`shared-kernel` 仅新增纯 Java 领域异常，生产依赖仍为空，未引入 Spring 或 Sa-Token。

## 实现边界

- Spring Boot BOM 锁定 `3.5.3`；Testcontainers BOM 保持既有 `1.21.4` 优先级，避免被 Boot BOM 传递降级。
- `shared-kernel` 新增 `BadRequest` / `Unauthorized` / `Forbidden` / `NotFound` / `Conflict` / `RateLimited`。
- `infrastructure` 建立 `web` / `exception` / `i18n` / `observability` / `jooq` / `security` 六个边界；`jooq` 本任务仅留空边界。
- `GlobalExceptionHandler` 映射六类领域异常、validation、malformed JSON、type mismatch、missing parameter/part、upload too large、405、415、404 与 unknown 500。
- 错误响应固定扩展 `code` / `traceId`；unknown 500 返回 `internal.server-error`，不回显异常 message，服务端保留完整异常日志。
- `TraceIdFilter` 固定使用 `X-Trace-Id`；仅信任 32 位小写十六进制入站值，其他值重新生成。
- `Accept-Language` 已回证 `zh-CN` / `en-US`，默认简体中文。
- 安全响应头包含 `X-Content-Type-Options` / `X-Frame-Options` / `Content-Security-Policy` / `Referrer-Policy`。
- 未实现 app 启动、认证、授权、CORS 或 Task 5 行为。

## TDD 证据

| 切片 | RED | GREEN |
|---|---|---|
| 领域异常 | 六个类型不存在，测试编译失败 | 六类均继承 `DomainException`，稳定 code/message 通过 |
| 领域 ProblemDetail | Controller 异常未被解析，MockMvc 抛 `ServletException` | 400/401/403/404/409/429 的 status/content-type/code/traceId 全通过 |
| 框架 4xx | 八类错误只有空 body，无 ProblemDetail | validation/malformed/type mismatch/missing param/missing part/413/405/415 全通过 |
| unknown 500 | 未知异常穿透为 `ServletException` | 返回稳定 500，body 不含敏感 message，日志保留 throwable |
| trace | valid 入站 trace id 未回传 | valid 原值回传，invalid 值重生 |
| i18n | 中英文 detail 均只返回 code | `zh-CN` / `en-US` 返回对应本地化 detail |
| 安全头 | 四个安全响应头均缺失 | 四个 header 值精确通过 |
| 成功 fixture | json/void/blob 端点未定义 | 对象直出、204 空体、blob 媒体类型/文件名/字节通过 |
| 结构与 BOM | `jooq` 边界缺失；Boot BOM 导致 Testcontainers 传递解析为 1.21.2 | 六边界完整；Testcontainers effective tree 全链恢复 1.21.4 |

## 验证

JDK：Homebrew OpenJDK `21.0.10`。

```bash
JAVA_HOME=/opt/homebrew/opt/openjdk@21 \
PATH=/opt/homebrew/opt/openjdk@21/bin:$PATH \
backend/mvnw -f backend/pom.xml -pl infrastructure -am verify
```

结果：`BUILD SUCCESS`。

- shared-kernel：5 tests
- admin-api：15 tests
- infrastructure：28 tests
- 合计：48 tests，0 failures，0 errors，0 skipped

Testcontainers effective tree 回证：`postgresql` / `jdbc` / `database-commons` / `testcontainers` 均为 `1.21.4`。

额外尝试完整 `backend/mvnw -f backend/pom.xml verify`，在既有 `schema-platform` Testcontainers 启动前因本机无可用 Docker environment 停止。该环境限制与 Task 4 代码无关；本报告不将全 backend verify 写成已通过。

## 工作区边界

8 个既有 `src/**` 用户脏文件未触碰、未 stage、未提交。本任务只提交 `backend/pom.xml`、`backend/infrastructure/**`、`backend/shared-kernel` 新增领域异常/测试与本报告。
