# ADR-0001：MetaBuilder 后端基础契约

- 状态：接受
- 日期：2026-07-11
- 适用范围：MetaBuilder 前后端、mock、OpenAPI 与后端模块

## 背景

脚手架需要一套不能由业务模块自行改写的传输、路径、权限、标识与 Origin 规则。否则前端 zod 契约、后端接口和派生项目会形成多种方言。

## 决策

### 传输方言

- 成功对象直接返回 JSON，不包装 `code/data/message` envelope。
- 分页固定返回 `{list,total}`。
- 无响应体使用 `204 No Content`；文件响应保留真实媒体类型、文件名与响应头。
- 错误使用 RFC 9457 `application/problem+json`，并固定扩展 `code` 与 `traceId`。
- `code` 是稳定的点分错误码；HTTP status 表达传输语义，二者不得互相冒充。

### API 路径

- 应用 API 统一位于 `/api/*`，当前不增加版本前缀。
- Actuator 仅用于运行状态，不属于业务 API。
- 破坏性变更由 OpenAPI snapshot 与差异门禁识别，不通过悄悄新增 `/v2` 规避。

### 权限码语法

- 权限码固定为三段式 `namespace:resource:action`。
- 每段只允许小写字母、数字与连字符，且必须以小写字母开头；整体匹配 `^[a-z][a-z0-9-]*(:[a-z][a-z0-9-]*){2}$`。
- 权限声明支持机器可读的 `AND/OR` 逻辑；多权限不得压成失去逻辑的字符串列表。
- 前端 route `staticData` 是权限码唯一声明源，后端只能消费声明过的权限码。
- P0a 将两段 legacy `dashboard:view` 统一迁移到 `dashboard:overview:view`；Task 14 的 catalog extractor/generator guard 负责拒绝后续两段权限码回流。

### 持久化 ID

- 所有持久化领域 ID 使用 UUIDv7，PostgreSQL 字段类型为 `uuid`。
- API path、DTO、事件与跨模块端口保持 UUID 语义，不引入旧 `Long` 域模型。

### Origin 与 CORS

- 开发环境通过 Vite `/api` proxy 保持同源；生产环境通过同域反向代理保持同源。
- CORS 默认空，不返回跨域许可响应头。
- 只有真实跨域部署才设置 `METABUILDER_CORS_ALLOWED_ORIGINS`；允许列表必须逐项显式配置，不允许通配符。

## 后果

- 前端、真实后端与 mock 必须遵守同一 wire contract。
- 模块不得自行引入 envelope、版本路径、第二套权限语法、Long ID 或默认开放 CORS。
- 任何修改以上决策的变更必须新增 ADR，并同步契约测试与 OpenAPI 门禁。
