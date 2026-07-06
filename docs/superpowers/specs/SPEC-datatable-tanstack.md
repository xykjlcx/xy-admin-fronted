# SPEC: DataTable 迁移至 TanStack Table + 表格层做透

> 执行者：Claude Code / Codex（无人值守但零降标）
> 范围：`src/components/pro/DataTable.tsx`、`src/components/ui/table.tsx`、`src/modules/admin/users/list/columns.tsx`、`src/modules/admin/users/list/MembersTable.tsx`、相关测试与 theme-states
> 目标：把自研的表格状态机替换为 TanStack Table（逻辑层），同时把表格样式层（`ui/table`）做透，**结构性根除选择列 checkbox 反复错位的问题**。
> 本 SPEC 是施工图。按 §10 顺序执行，每步过 §11 门禁再进入下一步。

---

## 0. 第一性原理（本次改造的"为什么"，决定所有"怎么做"）

在写任何代码前，执行者必须理解并认同以下推导。后续所有决策都从这里派生；遇到 SPEC 未覆盖的情况，回到这些原则判断。

### 0.1 表格 = 逻辑 + 样式，两者必须分离
一个数据表由两部分构成：
- **逻辑**：选择状态、排序状态、分页协调、行模型——"表格如何行为"。
- **样式**：`<table>`/`<tr>`/`<td>` 的 DOM 与视觉——"表格如何呈现"。

当前 `pro/DataTable` 把这两者混在一起手写，导致状态机与 DOM 补丁互相纠缠。正确形态：**逻辑交给 TanStack Table（headless，只给逻辑不给 DOM），样式留在 `ui/table`（只给 DOM 不含逻辑）**，DataTable 退化为"用前者驱动后者"的薄装配层。

### 0.2 选择列不是特殊列，是"一个渲染了 Checkbox 的普通列"
**这是本次改造的核心洞察，checkbox 顽疾的根治点。**

现状病灶：选择列被当作特殊情况处理，散落 6 处特殊补丁（`selectionColumnWidth`、`selectionCellClassName='h-14 p-0'`、`bodyCellWithSelectionClassName='h-14 py-0'`、`selectionSlotClassName` 手动 flex 居中、`ui/table` 中 `[&:has([role=checkbox])]:pr-0` 与 `translate-y-[2px]`）。这 6 处必须手工保持一致，任一处失配即 checkbox 错位——这就是它反复出问题的根因。

第一性纠正（对标 shadcn/TanStack 官方做法）：**选择列就是 `columns` 数组里的第一个普通列，它的 `cell` 恰好渲染一个 `<Checkbox>`，`enableSorting: false`**。它的对齐由 `TableCell` 统一的 `align-middle` 保证，与其它单元格走同一套，**不需要任何特殊高度、padding、slot、translate 补丁**。特殊处理消失 → 失配点消失 → checkbox 结构性对齐。

### 0.3 列宽是列的声明式属性，不是渲染时的散落配置
现状：`<colgroup>` + 每列手写 `width: string`，选择列宽单独硬编码。列宽与列定义分离，易漂移。
纠正：列宽作为列定义的一部分（本项目用 `ColumnDef.meta.width` 承载字符串宽度，见 §5.3；不用 TanStack 数值 `size`），跟着列走。渲染时统一从列定义读取宽度注入，不在 DataTable 内散写。

### 0.4 不做"大而全"组件，做"薄骨架 + 标准配方"
shadcn 官方明确反对把所有表格变体塞进一个 data-table 组件（会丢失 headless 的灵活性）。因此：
- DataTable **只封装每个表都相同的通用骨架**：TanStack Table 实例装配、表头/表体渲染、三态（loading/empty/data）、分页、选择列注入、批量条。
- **每表差异（列、排序开关、选择开关）通过 `columns` 与 props 配置**，不塞进 DataTable 内部当特殊逻辑。
- 目标是 DataTable 变**更薄**（预期从 200+ 行降到约 120 行内），而非更厚。

### 0.5 只做减法与替换，不趁机加需求
TanStack Table 功能极多（分组/透视/虚拟化/列固定/列拖拽/排序…）。本次**仅**引入 2 个能力：**行选择** 与 **（服务端）分页协调**。**排序不在本次范围**——它是全新能力（现状无排序），属"加需求"，与本次"迁移+根治"（纯重构、纯等价验收）性质不同，已拆为后续独立 SPEC。**严禁**顺手引入排序或任何其它 rowModel/高级特性。你的后台是 Data Table 不是 Data Grid（见团队调研结论），本次只需这两样。

### 0.6 单页选择：产品行为确认（成员页现状的结构化延续）
当前事实要分层看：
- 通用 `DataTable` 旧状态机用内部 `selectedIds` 全量数组，裸组件层面具备跨数据页累积选择能力。
- 当前 `MembersTable` 已通过 `resetSelectionKey` 把成员页实际行为限制为**翻页/换筛选/当前页数据变化即清空选择**，批量条也只统计当前可见选中 id。

本次产品行为已确认采用**单页选择**：选择只覆盖当前页，翻页/换筛选即清空。改造不是把成员页从"跨页累积"改成"单页选择"，而是把当前成员页已经依赖 `resetSelectionKey` 维持的单页行为，用 TanStack 受控 `rowSelection` 显式化、结构化，并删除脆弱拼接。

理由（第一性）：在服务端分页（`manualPagination`）下，TanStack Table 的实例内只有"当前页数据"，跨页累积选择需要额外维护"表外选择集"，正是自研状态机复杂度的来源。单页选择让选择状态与 TanStack 的 page-scoped API（`getIsAllPageRowsSelected` 等）天然对齐，实现简单、无水下礁石。对成员管理这类后台，单页批量操作是常见且可接受的交互。

**验收影响**：Step 0 行为基线必须分别记录"通用 DataTable 旧状态机具备跨数据页累积能力"与"成员页实际翻页/筛选清空"。改造后成员页应继续保持单页选择；通用 DataTable 删除跨页累积能力属于本 SPEC 明确批准的选择模型替换，不作为成员页行为回归。除此之外的所有成员页行为仍需等价。

---

## 1. 执行者须知（铁律，违反即任务失败）

1. **这是重构，不是重写业务。** DataTable 对外契约（`DataTableProps`）尽量保持兼容，使 `MembersTable` 改动最小。业务视觉/交互/文案 key 语义不得改变。
2. **依赖已就绪。** `@tanstack/react-table@^8.21.3` 已在 package.json，直接用，**不新增任何依赖**、不升级版本。
3. **每步一个 commit**（`refactor(table): step N - <内容>`），出错即停不回滚前序步骤，不跨步大改，不删测试/断言换绿，不用 `as any`/`@ts-ignore`/`eslint-disable` 绕过。
4. **范围红线**：本次只改 DataTable、ui/table、users 的 columns/MembersTable 及其测试与 theme-states。**不动** menus/roles/dashboard，**不动** TableShell 及其零件（仍被 menus/roles 使用），**不动**其它健康 pro/ui 组件。
5. **不确定不臆造**：SPEC 未定死处沿用现有写法；确有歧义标 `// SPEC-QUESTION:` 并停。
6. **checkbox 根治是硬指标**：改造后 `ui/table` 与 DataTable 中**不得残留任何针对 checkbox 的特殊补丁**（见 §0.2 枚举的 6 处），否则视为未达成核心目标。

---

## 2. 架构不变量（全程成立，均有守卫）

- **INV-T1 逻辑归属**：行选择由 TanStack Table 的 `rowSelection` 机制管理；DataTable 内不得再手写 `useRowSelection` 式的选择状态机（不得出现自维护的 `selectedIds` 全量数组 + `toggleRow`/`toggleVisibleRows` 逻辑）。
- **INV-T1b 单页选择**：本次采用**单页选择**语义——选择状态只覆盖当前页；翻页/换筛选即清空。**不实现跨页累积**（这是已确认的产品行为；对成员页是现状延续，对通用 DataTable 是选择模型替换，见 §0.6）。全选/半选基于 TanStack 的 `getIsAllPageRowsSelected`/`getIsSomePageRowsSelected`（当前页范围）。
- **INV-T2 样式纯净**：`ui/table` 与 DataTable 中不得出现任何 checkbox 专属补丁（`[role=checkbox]` 选择器 hack、`translate-y-[Npx]`、选择列专属高度/padding 常量）。
- **INV-T3 选择列即普通列**：选择列由 DataTable 构造为标准 `ColumnDef`（`[selectionColumn, ...columns]`）注入——注入是通用能力、允许；关键是它注入后**走与业务列完全相同的渲染路径**（同一 `flexRender` + 同一 `TableCell`），DataTable 表体渲染中**不得**存在 `selectionEnabled && <特殊选择单元格>` 这类特殊分支。构造时统一、渲染时无特例。
- **INV-T4 业务无关**：DataTable 不 import `@/modules/**`、不 `useTranslation`（文案经 props 注入）。
- **INV-T5 headless 边界**：DataTable 仅使用 `getCoreRowModel` 与行选择 API；**不得**引入 `getSortedRowModel`（排序本次不做）、`getFilteredRowModel`/`getGroupedRowModel`/`getFacetedRowModel`/虚拟化等本次范围外能力。
- **INV-T6 契约兼容**：`MembersTable` 对 DataTable 的调用改动控制在最小；若必须改 DataTableProps，须在报告中列出每处破坏性变更及 MembersTable 的对应适配。

---

## 3. Step 0：基线固化 + 现状确权（不写生产代码，不可跳过）

### 3.1 环境校验
```bash
cat package.json | grep -A30 '"scripts"'        # 核对门禁 script 实名
grep '@tanstack/react-table' package.json         # 确认已存在（应为 ^8.21.3）
```
确认 §11 的 script 名（`theme:guard`/`visual`/vitest 等）与实际一致；不一致以 package.json 为准并在报告说明。

### 3.2 checkbox 缺陷基线（本次要根治的对象，先取证）
在 `docs/baselines/datatable-checkbox-baseline.md` 记录改造前 checkbox 的现状与已知问题：
- 成员页在 90% / 100% / 108% 三档缩放下，表头全选框、行选择框的垂直对齐截图（归档到 `test-results/baseline-datatable/`）。
- 列出现有代码中所有 checkbox 相关的特殊处理（对照 §0.2 的 6 处逐条确认存在），作为"改造后必须全部消失"的清单。
- 记录现有行选择行为：单选、全选本页、半选（indeterminate）、通用 DataTable 裸组件跨数据页累积能力、成员页翻页/换筛选清空、批量停用触发。这是行为等价的锚点。

### 3.3 行为基线
逐条记录改造前成员表交互（分页、单选/全选本页/半选、翻页/换筛选清空、批量停用）到 `docs/baselines/datatable-behavior-baseline.md`。注意标注通用 `DataTable` 旧状态机的跨数据页累积能力与成员页实际单页选择行为的区别（§0.6），基线用于确认迁移后成员页继续保持单页选择、其余行为等价。

不得复用旧 `docs/baselines/users-behavior-baseline.md` 作为本次验收基线；它只能作为历史参考。本次必须新建 `datatable-checkbox-baseline.md` 与 `datatable-behavior-baseline.md`。

**Step 0 DoD**：环境确认、checkbox 缺陷清单、三档视觉基线、行为基线四者齐备。

---

## 4. Step 1：做透样式层 `ui/table`（先清补丁，为选择列普通化铺路）

**目标**：让 `ui/table` 成为纯净、通用的表格样式原语，去除一切 checkbox 专属 hack，使"放 Checkbox 的单元格"与普通单元格走完全相同的对齐逻辑。

### 4.1 删除 checkbox 专属 hack
- `TableHead`：删除 `[&:has([role=checkbox])]:pr-0` 与 `[&>[role=checkbox]]:translate-y-[calc(2px*var(--app-scale))]`。
- `TableCell`：同样删除上述两个 `[role=checkbox]` 相关 hack。
- 保留统一的 `align-middle`——这是让所有单元格（含 checkbox）垂直居中的**唯一且正确**机制。

### 4.2 建立列宽注入机制（配合 §5.3 的 ColumnDef.meta.width）
- `TableHead`/`TableCell` 增加对列宽的支持：接受一个可选 `style`（宽度由 DataTable 通过 CSS 变量或内联 width 注入，见 §6.3）。不在 ui/table 内写死任何列宽。
- 确认 `Table` 外层用 `table-fixed`（`table-layout: fixed`）使列宽生效——这是 shadcn issue #2854 的已知点：不显式接宽度时列宽默认不生效，故须由 DataTable 从 `meta.width` 显式注入 `<col>` 宽度。

### 4.3 约束
- `ui/table` 仍不含任何逻辑、不 i18n、不 import modules。
- 保持 `data-slot` 属性不变（其它地方可能依赖）。
- 保持对现有非 DataTable 使用方（若有）向后兼容；本次不改 TableShell。

**Step 1 DoD**：`ui/table` 中 grep 不到 `[role=checkbox]`、`translate-y`；现有 ui/table 测试全绿；视觉无回归（此步不涉及业务页，主要靠 theme-states 与单测）。

---

## 5. Step 2：columns 迁移到 TanStack `ColumnDef`（含选择列标准配方）

**目标**：把 `users/list/columns.tsx` 从自研 `DataTableColumn<T>` 迁移到 TanStack `ColumnDef<T>`，并把选择列实现为标准配方。

### 5.1 业务列迁移
把现有 5 个业务列（name/status/phone/dept/actions）改写为 `ColumnDef<UserDto>`：
- `header` → `header` 字段（字符串或渲染函数）。
- `cell: (row, index) => ...` → `cell: ({ row, table }) => ...`（用 `row.original` 取数据；页内 index 用 `row.index`）。
- `width` → **保留现有 `width: string` 字段承载列宽**（如 '24%'、'calc(120px*var(--app-scale))'），放入 `ColumnDef.meta.width`。现有 `<colgroup><col style={{width}}>` 机制已验证在 px/百分比混用下正常工作，**沿用之，不改机制**。**不使用** TanStack 数值 `size`。
- `align` → `meta: { align: 'start' | 'center' | 'end' }`。
- 现有单元格内的头像、StatusBadge、操作按钮渲染**原样保留**，视觉不得变。
- 保持 `userColumns(ctx)` 工厂形态（`t`/`permissions`/`deptById`/`onView`/`onEdit`/`onDelete` 经 ctx 注入），**columns 仍不 `useTranslation`**（INV-T4 精神延伸到业务列）。

### 5.2 选择列标准配方（§0.2 的落地，checkbox 根治的核心）
选择列作为 columns 的**第一个普通列**注入。**由 DataTable 统一提供该配方**（业务 columns 不写选择列），形如：

```tsx
const selectionColumn: ColumnDef<T> = {
  id: '__row_selection__',
  enableSorting: false,
  meta: { width: 'calc(44px * var(--app-scale))' },   // 普通列宽，非特殊常量
  header: ({ table }) => {
    const allSelected = table.getIsAllPageRowsSelected();
    const someSelected = table.getIsSomePageRowsSelected();
    return (
      <Checkbox
        // 本项目 ui/checkbox 是自研原生封装：checked 为布尔，另有独立 indeterminate 布尔 prop
        // （已核实 src/components/ui/checkbox.tsx，现有 DataTable 亦如此用）。不是 Radix 的 checked='indeterminate'。
        checked={allSelected}
        indeterminate={someSelected && !allSelected}
        onCheckedChange={(checked) => table.toggleAllPageRowsSelected(checked)}
        aria-label={selectAllLabel}
        onClick={(e) => e.stopPropagation()}   // 见 §6.2b，防冒泡
      />
    );
  },
  cell: ({ row }) => (
    <Checkbox
      checked={row.getIsSelected()}
      onCheckedChange={(checked) => row.toggleSelected(checked)}
      aria-label={rowSelectLabel}
      onClick={(e) => e.stopPropagation()}
    />
  ),
};
```

> checkbox API 已核实（§附录 C）：`ui/checkbox` 用独立 `indeterminate: boolean` prop，`checked`/`onCheckedChange` 均为布尔。上面配方已按此写定，无需再猜。

### 5.3 列宽策略（定死，消除 size/百分比矛盾）
- 现有列宽用百分比（24%/17%）和 `calc(...)`。**本次统一用 `meta.width` 承载原字符串宽度**（如 `meta: { width: '24%' }`、选择列 `meta: { width: 'calc(44px * var(--app-scale))' }`）。
- **不使用** TanStack 的 `size`（数值 px）——`size` 是给列宽调整/虚拟化用的，本次无此需求。
- 渲染时（§6.3）DataTable 从 `column.columnDef.meta?.width` 读取，注入现有的 `<colgroup><col style={{ width }}>`（此机制现状已工作，含选择列固定 px + 业务列百分比混用，无需改动）。选择列宽度同样经 `meta.width` 提供（如 'calc(44px*var(--app-scale))'）。
- `align` 同样进 `meta: { align }`，渲染时映射为对齐 class（保留现有 `alignClass` 逻辑）。

### 5.4 ctx 注入 + ColumnDef + flexRender 共存范式（照此写，避免闭包/meta 混用错误）
`userColumns(ctx)` 工厂在运行时用 `ctx`（t/permissions/deptById/回调）构造列。ctx 通过**闭包捕获**注入 cell，不放进 `table.options.meta`：

```tsx
export function userColumns(ctx: UserColumnsContext): ColumnDef<UserDto>[] {
  const { t, deptById, onView, onEdit, onDelete, permissions } = ctx;
  const canUpdate = !!onEdit && matchPermission(permissions, 'iam:user:update');
  return [
    {
      id: 'name',
      header: t('users.columns.name'),
      meta: { width: '24%' },
      enableSorting: false,                     // 本次全列禁排序
      cell: ({ row }) => {
        const user = row.original;              // 取业务数据
        const index = row.index;                // 页内序号
        return (/* 原头像+姓名渲染，视觉不变 */);
      },
    },
    // status / phone / dept / actions 同理，cell 用 ({ row }) => ...，闭包里用 ctx
  ];
}
```
- 表体渲染侧用 `flexRender(cell.column.columnDef.cell, cell.getContext())`（§6.1）。
- 业务 columns **仍不 `useTranslation`**，t 从 ctx 来。
- **所有列 `enableSorting: false`**（本次不排序）。

---

## 6. Step 3：重写 DataTable 为 TanStack Table 驱动的薄装配层

**目标**：DataTable 内部用 `useReactTable` 驱动，删除全部自研状态机与选择列特殊渲染。

### 6.1 内部改造
- 用 `useReactTable({ data, columns: [selectionColumn?, ...columns], getCoreRowModel: getCoreRowModel(), manualPagination: true, getRowId, state: { rowSelection }, onRowSelectionChange, enableRowSelection: selectionEnabled })`。**不含** `getSortedRowModel`/`manualSorting`/`onSortingChange`（排序本次不做）。
- **删除**：`useRowSelection` 式状态（`selectedIds` 数组、`toggleRow`/`toggleVisibleRows`、`resetSelectionKey` 的 useEffect 清空逻辑、`selectionNotificationReady` 等一整套）。改用 TanStack 的 `rowSelection` state（受控，见 §6.2）+ `getRowId`。
- `getRowId={(row) => rowKey(row)}`，选择基于稳定业务 id。
- **删除**：`selectionColumnWidth`/`selectionCellClassName`/`bodyCellWithSelectionClassName`/`selectionSlotClassName`/`selectionCheckboxClassName` 全部选择列专属常量。选择列走 §5.2 配方，作为普通列渲染。
- 表体渲染改为遍历 `table.getRowModel().rows` → `row.getVisibleCells()` → `flexRender(cell.column.columnDef.cell, cell.getContext())`。
- 表头改为遍历 `table.getHeaderGroups()` → `flexRender`。

### 6.2 选择状态：业务层受控（定死方案，消灭 resetSelectionKey）
**决策已定**：选择状态由业务层（MembersScene）受控持有，DataTable 不内部持有、不再有 `resetSelectionKey`。

- DataTable 的 `selection` 新增受控字段：`rowSelection: RowSelectionState` 与 `onRowSelectionChange: OnChangeFn<RowSelectionState>`，直接透传给 `useReactTable` 的 `state`/`onRowSelectionChange`。
  - ⚠️ **updater 范式**：`OnChangeFn` 传入的可能是**值或 updater 函数**。业务层持有方（MembersScene）的更新函数必须兼容两种形态。React 的 `useState` setter 天然兼容该类型，但本项目规则不鼓励把 `setState` 裸传给子组件，因此按 §7 用语义包装函数承接：`setRowSelection((current) => typeof updater === 'function' ? updater(current) : updater)`。
- **`resetSelectionKey` prop 彻底删除**（连同其 useEffect diff 清空逻辑）。业务层不再拼接触发键。
- 翻页/换筛选清空：由 MembersScene 在改 search 时**显式**把 `rowSelection` 置为 `{}`（见 §7）。这符合"状态就近"——谁改筛选谁清空，不靠 DataTable 猜。
- `renderBulkBar` 的选中项：从受控 `rowSelection` 推导当前页选中 id 传入（单页选择下即全部选中项）。
- 理由见 §0.6：单页选择 + 受控 = 数据流最干净、无跨页水下礁石、删除脆弱拼接。

### 6.2b 选择列与行点击的事件隔离（不可遗漏）
现状选择单元格有 `onClick={(e) => e.stopPropagation()}`，防止点 checkbox 误触发 `onRowClick`。**重写后必须保留此隔离**：选择列 cell（及表头全选 cell）内的点击不得冒泡触发行点击。否则会出现"点勾选框弹出详情"的 bug。守卫或测试须覆盖此点。

### 6.3 列宽注入
- 从 `column.columnDef.meta?.width`（§5.3）读取宽度，通过 `<colgroup><col style={{ width }}/>` 注入。统一一处，不散写。**不使用** 列定义宽度（本次不用 TanStack size 机制）。
- `<table>` 采用 `table-fixed` 使宽度生效（见 §4.2）。

### 6.4 对外契约（DataTableProps）——明确哪些兼容、哪些是允许的破坏性变更
- **保持兼容（语义不变）**：`data`/`rowKey`/`loading`/`emptyText`/`loadingText`/`pagination`/`onRowClick`/`rowState`。
- **允许的破坏性变更（本次明确批准，不算违反"兼容"）**：
  - `columns` 类型：`DataTableColumn<T>[]` → `ColumnDef<T>[]`。
  - `selection`：从 `{ enabled, onSelectionChange, renderBulkBar }` → 受控 `{ enabled, rowSelection, onRowSelectionChange, renderBulkBar, selectAllAriaLabel?, rowSelectAriaLabel? }`。
  - 删除 `resetSelectionKey` prop。
  - 删除 `DataTableColumn`/`DataTableSelection` 旧类型（Step 4 后）。
  这三项是本次改造的必然结果，MembersTable 随之适配即可，不判定为"破坏兼容"违规。报告中列出每处变更与 MembersTable 对应改动。
- `columns` 类型从 `DataTableColumn<T>[]` 变为 `ColumnDef<T>[]`——这是**必要的破坏性变更**，MembersTable 的 columns import 随之变。这是唯一允许的对外类型变更，须在报告标注。
- `selection` 字段调整为受控形态：`{ enabled, rowSelection, onRowSelectionChange, renderBulkBar, selectAllAriaLabel?, rowSelectAriaLabel? }`。**移除** `onSelectionChange`（改由受控 `rowSelection` 传导）。aria label 为可选（选择列配方需要，本次传通用文案即可，非无障碍强需求）。
- **移除** `resetSelectionKey` prop（见 §6.2）。
- 三态（loading/empty/data）渲染逻辑保留，仅数据来源换成 `table.getRowModel()`。

**Step 3 DoD**：DataTable grep 不到自研选择状态机、grep 不到选择列专属常量；`useReactTable` 已接入；rowModel/headerGroup 驱动渲染。

---

## 7. Step 4：MembersScene / MembersTable 适配（受控选择）

- `columns` import 改为新的 `ColumnDef<UserDto>` 工厂产物。
- **选择状态上移到 MembersScene**（受控持有者）：
  - 虽然通用架构文档曾把"表格选择"归为 `DataTable` 内部状态，但本次成员页选择会被筛选/分页/部门树/批量停用共同消费；最近公共父是 `MembersScene`。因此本 SPEC 对成员页采用受控选择，优先级高于历史通用表述。
  - MembersScene 新增 `const [rowSelection, setRowSelection] = useState<RowSelectionState>({})`，经 MembersTable 透传给 DataTable 的 `selection.rowSelection`/`onRowSelectionChange`。
  - 为遵守项目"不把 setState 作为 prop 下传"的规则，推荐在 MembersScene 暴露语义包装函数，而非裸传 `setRowSelection`：
    ```tsx
    const handleRowSelectionChange: OnChangeFn<RowSelectionState> = (updater) => {
      setRowSelection((current) => (typeof updater === 'function' ? updater(current) : updater));
    };
    ```
  - **prop 穿透链（照此接，勿漏层）**：
    ```
    MembersScene（持有 rowSelection + handleRowSelectionChange）
      └─ props: rowSelection, onRowSelectionChange={handleRowSelectionChange}
         MembersTable（透传，不自己持有）
           └─ selection={{ enabled, rowSelection, onRowSelectionChange, renderBulkBar, ...ariaLabel }}
              DataTable → useReactTable state
    ```
    MembersTable 只透传、不持有选择状态（它仍持有自己的 usersQuery）。
  - **翻页/换筛选即清空 + 时序**：MembersScene 在调用 `onSearchChange`（改 page/deptId/status/keyword/directOnly 任一）时，**同一事件处理中**一并 `setRowSelection({})`。放在同一次交互里，React 会批处理 search 变更与选择清空，避免"新页数据+旧选中态"的中间帧。单页选择语义（§0.6）。
- **彻底移除** MembersTable 中的 `resetSelectionKey` 9 字段手工拼接（§users review 指出的易碎点）——不再需要，受控清空替代之。
- 批量停用 `renderBulkBar` 逻辑保留，选中 id 从受控 `rowSelection` 的 keys 推导（`Object.keys(rowSelection)`），语义为"当前页选中项"。批量操作成功后 `setRowSelection({})`。
- 本步**不涉及排序**（排序已拆出本 SPEC）。

**Step 4 DoD**：成员页行为与基线逐条等价（分页/单选/全选本页/半选/翻页清空/换筛选清空/批量停用/详情/编辑/删除）；通用 DataTable 的跨数据页累积能力已按 §0.6 被单页选择模型替换；无排序相关改动。

---

## 8. Step 5：theme-states 与守卫测试

### 8.1 theme-states 更新
- 更新 `/dev/theme-states` 中 DataTable 样例：覆盖 空/加载/有数据/全选/半选(indeterminate)/单行选中 状态，供三档截图。
- **特别加入 checkbox 对齐验证样例**：在样例中放置选择列，供三档缩放下人工/截图确认垂直居中。

### 8.2 守卫测试（新增/更新）
1. **INV-T2**：读 `ui/table.tsx` 与 `DataTable.tsx` 源码，断言不含 `[role=checkbox]`、不含 `translate-y-`，不含 `selectionCellClassName`/`selectionColumnWidth` 等选择专属常量名。
2. **INV-T1**：断言 DataTable 不含自维护选择数组的模式（无 `const [selectedIds, setSelectedIds]` 这类；改用 TanStack state）。
3. **INV-T5**：断言 DataTable 只 import 了 `getCoreRowModel`（+行选择 API），**不含** `getSortedRowModel`/`getFilteredRowModel`/`getGroupedRowModel`/`getFacetedRowModel`/`useVirtualizer`。
4. **INV-T4**：断言 DataTable 不 import `@/modules/`、不 `useTranslation`。
5. **INV-T3**：断言选择列经 columns 注入（DataTable 中不存在独立的"选择单元格"特殊 JSX 分支）——可通过断言 DataTable 源码不含 `selectionEnabled &&` 形态的特殊行渲染近似守。
6. **INV-T1b/6.2b**：断言 DataTable 不含 `resetSelectionKey`、不含自维护 `selectedIds` state；断言选择 cell 保留 `stopPropagation`（防行点击冒泡）。
7. 更新既有 DataTable 测试到新实现（见 §8.3 测试迁移对照表）。

### 8.3 既有测试迁移对照表（旧断言必然红，按此处置，勿删换绿）

现有 `data-table.test.tsx` 断言的是旧自研实现，重写后会红。按下表处置：

| 现有断言类型 | 处置 | 说明 |
| --- | --- | --- |
| 断言 `toggleRow`/`toggleVisibleRows` 等内部方法行为 | **删除并重写** | 内部实现已换 TanStack，测行为不测内部方法 |
| 断言 `resetSelectionKey` 变化清空选择 | **改写** | 改为断言受控 `rowSelection` 传空即清空 |
| 断言全选/半选/单选 UI 行为 | **保留语义，改写实现** | 用受控 rowSelection 驱动，断言 checkbox 状态 |
| 断言 loading/empty 三态 | **保留** | 三态渲染逻辑不变，仅数据源换 rowModel |
| 断言批量条 renderBulkBar | **改写** | 选中项来源改为 rowSelection keys |
| （新增）点选择框不触发 onRowClick | **新增** | §6.2b 事件隔离 |
| （新增）翻页 data 变化后选择清空 | **新增** | §0.6 单页选择 |

处置原则：**行为语义仍成立的 → 保留语义改写实现；只测旧内部机制的 → 删除重写**。不得为了让旧测试变绿而保留旧实现。

---

## 9. 验收（行为 + 视觉 + checkbox 根治三重）

### 9.1 门禁（每步都跑，见 §11）
### 9.2 checkbox 根治验收（本次核心，硬指标）
- 对照 Step 0 的 checkbox 缺陷清单，逐条确认 6 处特殊补丁**全部消失**（grep 证据 + 代码 review）。
- 三档缩放（90/100/108%）下，表头全选框、行选择框、半选态垂直居中，与文本单元格基线对齐；**不得**再有 2px 偏移类现象。对比 Step 0 基线截图，checkbox 区域必须改善或持平，绝不退化。
### 9.3 行为等价（对照行为基线，逐条勾选清单）
- 成员页单选/全选本页/半选/翻页清空/换筛选清空/批量停用 全部与基线等价。
- 通用 DataTable 旧状态机的跨数据页累积能力已删除，按 §0.6 记为选择模型替换，不作为成员页回归。
- 分页、空态、加载态、详情/编辑/删除入口 与基线等价。
### 9.4 视觉回归
- DataTable 局部验收以 Step 0/Final 的 checkbox 对齐数值和截图为准：90%/100%/108% 下未选中与半选态的表头/行 checkbox `deltaToCellCenter` 改善或持平，亚像素级四舍五入差异不得形成可见偏移。
- `/dev/theme-states` 必须覆盖 partial/all/single/loading/empty，相关状态三档缩放下无溢出或功能性视觉差异。
- 全页 prototype diff（`pnpm visual`）作为辅助证据记录；若因既有原型/实现全页差异超过 0.5%，不得据此掩盖 DataTable 局部退化，需在报告中说明差异口径与是否和本次表格迁移相关。

---

## 10. 执行顺序（严格按序，每步过 §11）

| Step | 内容 | 依赖 |
| --- | --- | --- |
| 0 | 基线固化（环境/checkbox 缺陷/视觉/行为） | — |
| 1 | 做透 `ui/table`（删 checkbox hack + 列宽注入机制） | 0 |
| 2 | columns → `ColumnDef`（业务列 + 选择列配方，全列 enableSorting:false） | 0 |
| 3 | 重写 DataTable 为 TanStack Table 驱动（删自研状态机与选择特殊渲染） | 1,2 |
| 4 | MembersScene/MembersTable 适配（受控选择、翻页清空） | 3 |
| 5 | theme-states + 守卫测试 | 3,4 |

> **中间态可编译要求（强制逐步，不开合并后门）**：每个 Step 必须独立 commit 且可编译。具体做法：
> - Step 2：新 `ColumnDef` 工厂**与旧 columns 并存**（新工厂命名如 `userColumnsV2` 或置于新文件），此步不接入 MembersTable，旧路径仍可编译运行。
> - Step 3：重写 DataTable。为保证此步可编译，DataTable 可临时**同时导出**新签名；若旧 `DataTableColumn` 类型仍被引用，暂时保留其类型定义（Step 4 后再删）。
> - Step 4：MembersTable 切换到新 columns + 受控选择，删除旧 columns 与旧类型残留。
> - 不允许把 Step 2-4 合并为一个大 commit。若某步确实无法独立编译，说明具体障碍并**停下报告**，由维护者决定，而非自行合并。

---

## 11. 门禁（每步必跑，全绿再继续）

```bash
./node_modules/.bin/tsc -b --noEmit
./node_modules/.bin/eslint src
./node_modules/.bin/vitest run
pnpm theme:guard
```
- Step 4/5 后额外：`pnpm visual`（对比 Step 0 三档基线）+ 生产构建 mock 剥离断言（`vite build` 后 grep dist 无 `faker|msw|mockServiceWorker`）。
- 每步报告含"降标自检"栏（未删测试/断言/功能，未用 disable/ignore/as any）。

---

## 12. 完成定义（DoD 总）

- [ ] Step 0 基线四件齐备。
- [ ] `ui/table` 与 DataTable 中 §0.2 枚举的 6 处 checkbox 特殊补丁**全部消失**（grep 证据）。
- [ ] DataTable 内部由 `useReactTable` 驱动；自研选择状态机（selectedIds 数组 + toggle + resetSelectionKey diff）已删除（INV-T1 守卫绿）。
- [ ] 选择状态由 MembersScene 受控持有；`resetSelectionKey` 已彻底移除；翻页/换筛选显式清空（单页选择，§0.6）。
- [ ] 选择 cell 保留 stopPropagation，点 checkbox 不触发行点击（§6.2b）。
- [ ] 选择列作为标准 ColumnDef 注入，cell 渲染 Checkbox，无特殊单元格分支（INV-T3 守卫绿）。
- [ ] 仅引入 core rowModel 与行选择 API，**无排序**、无其它范围外 TanStack 能力（INV-T5 守卫绿）。
- [ ] DataTable 不 import modules、不 i18n（INV-T4 守卫绿）。
- [ ] columns.tsx 为 `ColumnDef<UserDto>`；业务单元格视觉与改造前一致。
- [ ] checkbox 三档对齐验收通过（对照基线，改善或持平，无退化）。
- [ ] 行为等价清单逐条勾选通过（成员页继续保持单页选择；通用 DataTable 跨数据页累积能力删除按 §0.6 记录为选择模型替换）。
- [ ] **单页选择的产品可接受性已由维护者确认**（翻页后选择清空、批量操作仅作用当前页选中项；报告中仍需显式列出该产品行为）。
- [ ] DataTable 局部视觉验收通过：checkbox 对齐改善或持平，theme-states 三态/加载/空态无功能性视觉差异；全页 prototype diff 若超过 0.5%，已在报告中说明口径与非本次回归依据。
- [ ] §11 门禁全绿；生产包无 mock 残留。
- [ ] 每步独立 commit；每个 SPEC-QUESTION 在 PR 描述列出并说明处置。

---

## 附录 A：现状病灶速查（改造前的 6 处 checkbox 特殊补丁，须全部消除）

| # | 位置 | 补丁 | 消除后 |
| --- | --- | --- | --- |
| 1 | DataTable | `selectionColumnWidth = 'calc(44px*var(--app-scale))'` | 改为选择列 `meta.width` 的普通列宽 |
| 2 | DataTable | `selectionCellClassName = 'h-14 p-0'` | 删除，选择单元格走普通 TableCell |
| 3 | DataTable | `bodyCellWithSelectionClassName = 'h-14 py-0'` | 删除，普通单元格不因选择列改变 |
| 4 | DataTable | `selectionSlotClassName = 'flex h-full items-center justify-center'` | 删除 DataTable 级 slot 补丁；选择列只允许作为普通 ColumnDef cell 内容布局，不得使用 table/role selector hack |
| 5 | ui/table TableHead/Cell | `[&:has([role=checkbox])]:pr-0` | 删除 |
| 6 | ui/table TableHead/Cell | `[&>[role=checkbox]]:translate-y-[calc(2px*var(--app-scale))]` | 删除，垂直居中靠 align-middle |

## 附录 B：TanStack Table 本次允许使用的 API 白名单（超出即违反 INV-T5）
- `useReactTable`、`flexRender`、`createColumnHelper`（可选）
- `getCoreRowModel`（**不含** `getSortedRowModel`——排序本次不做）
- 行选择：`getIsAllPageRowsSelected`/`getIsSomePageRowsSelected`/`toggleAllPageRowsSelected`/`getIsSelected`/`toggleSelected`/`getSelectedRowModel`/`resetRowSelection`/`getRowId`
- 分页：`manualPagination`（分页 UI 仍用现有 Pagination 组件，不用 TanStack 分页 rowModel）
- **禁用**：排序（getSortedRowModel/manualSorting/相关 API）、filtered/grouped/faceted/expanded rowModel、column resizing/pinning、虚拟化。

## 附录 C：已核实的项目组件 API（避免执行者臆断）
| 组件 | 关键 API | 结论 |
| --- | --- | --- |
| `ui/checkbox` | `checked: boolean`、独立 `indeterminate?: boolean`、`onCheckedChange: (checked: boolean) => void` | 自研原生 input 封装，**非 Radix**。半选用 `indeterminate` 布尔 prop，不是 `checked='indeterminate'`。选择列配方（§5.2）已按此写定。 |
| `ui/table` | `Table/TableHeader/TableBody/TableRow/TableHead/TableCell`，`data-slot` 属性 | 标准 shadcn 结构。列宽经 `<colgroup><col style width>` 注入，px/百分比混用已验证正常。 |
| 现有 `DataTable` | 列宽 `width: string`、`<colgroup>` 注入、`selectionColumnWidth` 等 6 处 checkbox 补丁 | 补丁清单见附录 A，须全部消除。列宽机制沿用，选择列特殊常量删除。 |
