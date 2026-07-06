# DataTable Behavior Baseline

生成时间：2026-07-06 11:38 CST

基线对象：`/admin/users?page=1&pageSize=10&status=all&keyword=`。本基线只记录 DataTable 迁移前行为，用于 Step 4/5 对照。

## 关键口径

- 通用 `DataTable` 旧实现内部持有 `selectedIds`，裸组件层面可跨数据页累积选择。
- 当前成员页 `MembersTable` 通过 `resetSelectionKey` 把实际产品行为限制为单页选择：翻页、筛选、当前页 id 列表变化或批量操作成功后清空选择。
- 本次已确认最终产品行为就是单页选择；迁移后成员页应延续该行为。

## 代码与测试证据

- `src/components/pro/DataTable.tsx`
  - `selectedIds` 内部状态：line 88
  - `resetSelectionKey` diff 清空：lines 100-104
  - `toggleRow`：lines 126-130
  - `toggleVisibleRows`：lines 132-138
- `src/modules/admin/users/list/MembersTable.tsx`
  - `resetSelectionKey` 包含 `variant/status/deptId/directOnly/keyword/page/pageSize/currentPageIds/bulkResetVersion`：lines 50-60
  - `onPageChange` 写入 `{ page }`：line 116
  - 批量操作成功后 `bulkResetVersion + 1`：lines 62-65
- 聚焦测试：
  - `./node_modules/.bin/vitest run src/components/pro/__tests__/data-table.test.tsx src/modules/admin/users/__tests__/users-page-step4.test.tsx src/modules/admin/users/__tests__/users-page-step5.test.tsx`
  - 结果：3 files / 15 tests passed

## Browser 行为证据

Agent Browser 证据文件：`test-results/baseline-datatable/behavior-evidence.json`。

交互序列：

| 步骤 | URL / 页码 | checkbox 状态 | 批量入口 |
| --- | --- | --- | --- |
| 初始 | page 1 | 表头未选中，行选择框未选中 | 不显示 |
| 单选第 1 行 | page 1 | 表头 `indeterminate=true`，第 1 行 `checked=true` | `批量禁用` 出现 |
| 全选本页 | page 1 | 表头 `checked=true`，当前页 10 行全部选中 | `批量禁用` 出现 |
| 点击下一页 | page 2 | 表头未选中，行选择框未选中 | 不显示 |

## 行为清单

| 行为 | 当前基线 |
| --- | --- |
| 单选 | 支持；单选后行 checkbox checked，表头 checkbox 进入半选态 |
| 全选本页 | 支持；表头 checkbox 可选中当前页所有行 |
| 半选态 | 支持；单选 1 行后表头 input `indeterminate=true` |
| 通用 DataTable 跨数据页累积能力 | 裸组件旧状态机可累积，旧测试覆盖同一 `resetSelectionKey` 下跨 data rerender 后 selectedIds 保留 |
| 成员页翻页清空 | 支持；选中当前页后点击下一页，page 2 全部 checkbox 清空，批量入口消失 |
| 成员页筛选清空 | 当前通过 `resetSelectionKey` 包含 status/deptId/directOnly/keyword/currentPageIds 实现；Step 4 后改为 MembersScene 显式清空 |
| 批量停用入口 | 有选中且具备 `iam:user:resign` 权限时显示 `批量禁用` |
| 批量停用触发 | 当前按钮调用 `handleBatchDisable(selectedVisibleIds)`，只传当前可见选中 id；本 Step 0 未在浏览器触发写操作 |
| 详情入口 | 行内 `详情` 按钮存在 |
| 编辑入口 | 成员 tab 且具备权限时行内 `编辑` 按钮存在 |
| 删除入口 | 成员 tab 且具备权限时行内删除图标存在，aria 文案为 `删除{{name}}` |
| 空态/加载态 | 现有 `DataTable` 测试覆盖 loading rows 与 empty row，迁移后应保留语义 |

## Step 0 SPEC-QUESTION

无。

