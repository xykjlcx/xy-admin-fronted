# 尾程快递子系统实施计划

## 阶段 1：基础注册与守卫

1. 先写失败的纵切结构、路由薄壳、manifest、Mock 聚合与视觉场景守卫。
2. 注册 `lastmileManifest`、路由壳、locale namespace 与图标。
3. 建六个标准纵切包骨架，不建立横切目录。

## 阶段 2：读模型

1. 完成六个包的 zod schema、key factory、queryOptions 与 Mock 数据库。
2. 实现运营概览。
3. 实现运单、客户、渠道、承运商、供应商、账单列表与详情只读场景。
4. 为每个 handler 与页面补最小红绿测试。

## 阶段 3：写模型

1. 运单：创建、批量打单、单票打单、下载与导出。
2. 客户：创建、渠道授权。
3. 渠道：创建、编辑、启停、批量启用、连接测试。
4. 承运商/供应商：创建。
5. 账单：筛选与导出。

## 阶段 4：工程与视觉收口

1. 补齐 i18n、权限动作、Mock 聚合、route tree 与错误/空/加载态。
2. 格式化本轮文件并运行类型、Lint、全量测试、主题守卫、设计规范和生产构建。
3. 将尾程快递主页面加入 Agent Browser 原型/实现/比例回归；跑关键 Mock 业务链路。
4. 做一次 issue-first 对抗性 review，修复后重跑受影响门禁。

## 完成门槛

- 原型页面没有缺页，原型中的按钮没有无反馈假动作；原型外新增表单只服务于原型已声明的新增入口。
- 所有 URL 可直接刷新，详情 URL 使用真实 id，Mock 状态在同一会话内可回看。
- 六个业务包遵循 Users 纵切；无业务 DTO 复制、无内联 query key、无业务层裸控件。
- 全量门禁与浏览器验收全部通过后才允许结束 Goal。

## 2026-07-10 完成回证

- 已落地 7 个标准纵切包：`overview`、`shipments`、`customers`、`channels`、`carriers`、`suppliers`、`billing`，共 111 个实现/测试文件；路由壳、manifest、locale 与 Mock 聚合均已注册。
- Agent Browser 已走通：运单创建 → 保存并打单 → 打印 → 列表回读；渠道创建 → 测试连接 → 启停 → 编辑回显；客户创建 → 详情 → 渠道授权；承运商/供应商创建；账单筛选与 CSV 下载；面单 PDF 下载。
- 浏览器自审修复了四类真实问题：Select 空值受控警告、主数据表单标签未关联、渠道 `settlement` 种子字段错位、直接 API 链接下载到 HTML 回退页；均已增加回归测试。
- 运单与渠道列表补回原型 KPI 信息层级，同时继续使用现有 Card/DataTable/FilterSelect/token，不复制原型旧表格实现。
- 最终工程门禁：TypeScript 通过；ESLint 0 error（仅 TanStack Table 已知 React Compiler warning）；Vitest 103 files / 609 tests；theme guard 4 files / 194 tests；design lint 0 error；生产构建通过且 `dist` 无 faker/MSW/worker 标记；`git diff --check` 通过。
- 最终视觉报告覆盖 20 个主场景；尾程 7 个主页面在 90%/100%/108% 三档均 page-ready 且无整页水平溢出；24/24 主题矩阵通过。原型/实现像素差异范围 1.96%–8.59%，尾程页面差异来自真实 Shell、工程化控件和功能密度，已结合实现截图与 diff 图人工复核。

## 2026-07-10 全面复审与加固回证

- 所有尾程 Query 页面补齐加载、失败与重试状态；所有列表把失败态下沉到公共 `DataTable`，详情/表单选项使用公共 `QueryState`，不再静默空白。
- 运单导出、账单导出与面单下载改为可观察 Mutation，失败不再形成未处理 Promise；渠道草稿支持恢复，渠道 KPI 使用不受筛选污染的全局统计。
- 768px Agent Browser 复核通过：Shell 自动折叠为 64px，尾程渠道页可读可操作，document 无水平溢出。
- 最新全仓门禁：104 files / 624 tests；theme guard 4 files / 196 tests；TypeScript、ESLint、design lint、生产构建与 Mock 剥离扫描通过。
- 2026-07-10 20:09 视觉报告重新采集；尾程 7 个主页面在 90%/100%/108% 三档全部 page-ready、无整页水平溢出，24/24 主题矩阵全部通过。最高差异的渠道与运单页已人工复核，差异来自真实数据行、可用筛选器、动作列和 Shell，而非结构缺失或功能降级。
