# 尾程快递子系统工程化设计

## 1. 目标

把 `后台管理脚手架.dc.html` 中尾程快递原型完整落到现有脚手架，形成可在 Mock 环境演示真实业务闭环、可替换为后端接口、可适配四套风格与三档显示比例的示例子系统。

完成定义不是“页面能打开”，而是：

- 原型中的运营概览、运单、客户、渠道、承运商、供应商、账单页面全部有真实路由；
- 列表筛选、详情切换、创建/编辑、状态变更、授权、导出、打单与轨迹均有可回看的 Mock 状态；
- 目录、请求、缓存、权限、i18n、Mock、视觉验收全部遵循 `modules/admin/users` 纵切范本；
- 通过类型、Lint、测试、主题守卫、生产构建、Mock 剥离和 Agent Browser 验收。

## 2. 领域纵切

尾程快递拆成六个业务包，不建立 `modules/lastmile/pages`、`modules/lastmile/api` 等横切目录：

```text
src/modules/lastmile/
├── manifest.ts
├── overview/       运营指标、最近运单、渠道用量
├── shipments/      列表、创建、详情、打单、轨迹
├── customers/      列表、创建、详情、渠道授权、价格、流水
├── channels/       列表、创建/编辑、详情、连接测试、启停
├── carriers/       列表、创建、详情、服务与关联渠道
├── suppliers/      列表、创建、详情、凭证、映射与渠道
└── billing/        客户账单、状态筛选与导出
```

每个包固定包含 `index.tsx / api / mocks / model.ts / types.ts / list / detail / form / __tests__`。简单目录允许只放导出文件，但不省略骨架。

## 3. URL 协议

| 场景 | URL |
| --- | --- |
| 运营概览 | `/lastmile/overview` |
| 运单列表 | `/lastmile/shipments` |
| 新建运单 | `/lastmile/shipments/new` |
| 运单详情 | `/lastmile/shipments/$shipmentId` |
| 运单打单 | `/lastmile/shipments/$shipmentId/print` |
| 运单轨迹 | `/lastmile/shipments/$shipmentId/track` |
| 客户账户 | `/lastmile/customers` |
| 客户详情 | `/lastmile/customers/$customerId` |
| 物流渠道 | `/lastmile/channels` |
| 新建渠道 | `/lastmile/channels/new` |
| 渠道详情 | `/lastmile/channels/$channelId` |
| 编辑渠道 | `/lastmile/channels/$channelId/edit` |
| 承运商 | `/lastmile/carriers`、`/lastmile/carriers/$carrierId` |
| 供应商 | `/lastmile/suppliers`、`/lastmile/suppliers/$supplierId` |
| 客户账单 | `/lastmile/billing` |

列表筛选写入 URL search；详情只保存 id，并通过独立 detail query 请求全量数据。

## 4. Mock 业务闭环

### 4.1 运单

- 按关键词、状态过滤；导出生成 CSV；批量打单只处理待打单运单。
- 新建表单选择客户、渠道并填写收件人与包裹，保存后进入列表；“保存并打单”进入新运单打单页。
- 打单动作把状态从 `pending` 推进为 `printed` 并生成跟踪号；下载生成 Mock PDF 文件。
- 详情四个 tab 使用同一详情 query；轨迹页展示由状态派生的节点。

### 4.2 客户

- 新增客户写入 Mock 数据库。
- 详情展示账户、额度、基本资料、渠道授权、价格方案和流水。
- 渠道授权开关是写操作，变更后失效客户详情缓存。

### 4.3 渠道

- 列表支持关键词、类型、状态和分页；启停、批量启用均持久化到 Mock 数据库。
- 创建/编辑表单包含供应商 → 承运商 → 服务级联、账号归属、区域、价格和 API 配置。
- 测试连接返回延迟与成功结果；详情可启停并展示 API、区域、报价和审计日志。

### 4.4 承运商与供应商

- 列表搜索、创建和详情可用；新增数据写入 Mock 数据库。
- 详情分别展示承运服务/关联渠道，以及接入凭证/承运商映射/关联渠道。
- API Secret 只展示掩码，Mock 和源码不保存真实密钥。

### 4.5 账单

- 关键词与状态筛选、汇总应收金额、CSV 导出可用。

## 5. 数据、缓存与权限

- DTO 和表单入参只由各包 `api/schema.ts` 的 zod schema 推导。
- 每个包有独立 key factory；写操作按业务前缀失效缓存。
- 跨业务下拉数据由本业务的 options endpoint 返回，业务包之间不直接 import DTO。
- 权限前缀使用 `lastmile:*`：`overview`、`shipment`、`customer`、`channel`、`carrier`、`supplier`、`billing`。
- `manifest.ts` 同时注册子系统、菜单与操作权限；路由 `staticData.actions` 是按钮权限声明源。

## 6. UI 与多主题

- 页面骨架复用 `PageFrame / PageHeader / DataTable / DescriptionList / AnimatedTabs / FormDialog / ConfirmDialog / StatusBadge`。
- 业务层只写布局；颜色、状态、圆角、hover/focus 由 UI/Pro 组件与语义 token 承担。
- 原型中宽表保留 DataTable 的单一横向滚动容器，整页禁止横向溢出。
- 详情页采用全屏详情 + 摘要 + tabs，不把复杂业务对象塞进抽屉。
- 打印面单保留白底黑字的真实打印预览区，它属于文档媒介而非主题表面；外围界面仍跟随主题。

## 7. 验收

- 单测覆盖 schema、handler、列表筛选、创建、状态变更、详情 tab 和授权。
- 架构守卫覆盖六个纵切包、薄路由、key factory、Mock 聚合、manifest 与视觉场景。
- Agent Browser 覆盖所有主页面，关键创建/编辑/打单/授权链路，以及 90% / 100% / 108% 三档比例。
- 最终运行仓库全部强制门禁，并确认生产包不含 `faker`、`msw` 或 mock worker。
