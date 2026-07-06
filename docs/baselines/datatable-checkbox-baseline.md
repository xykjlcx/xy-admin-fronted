# DataTable Checkbox Baseline

生成时间：2026-07-06 11:38 CST

基线对象：`/admin/users?page=1&pageSize=10&status=all&keyword=`，当前分支 `codex/datatable-tanstack`。本基线只记录改造前事实，不改生产代码。

## 环境确认

- package name：`admin-scaffold-frontend`
- TanStack Table：`@tanstack/react-table@^8.21.3` 已存在
- 门禁脚本实名：
  - `typecheck`: `tsc -b --noEmit`
  - `lint`: `eslint src`
  - `test`: `vitest run`
  - `theme:guard`: `vitest run src/styles/__tests__/theme-guards.test.ts src/styles/__tests__/tokens.snapshot.test.ts src/app/__tests__/module-boundaries.test.ts`
  - `visual`: `node scripts/visual-agent-browser.mjs all`
- Dev server：复用 `http://localhost:5173`，PID `17526`，cwd `/Users/ocean/Documents/通用脚手架前端`
- Browser：Agent Browser session `datatable-step0-baseline`，viewport `1440x900`

## 现状病灶：6 处 checkbox 特殊补丁

以下 6 处是后续必须全部消除的根治清单。

| # | 文件 | 当前补丁 | 证据 |
| --- | --- | --- | --- |
| 1 | `src/components/pro/DataTable.tsx` | `selectionColumnWidth = 'calc(44px * var(--app-scale))'` | line 61 |
| 2 | `src/components/pro/DataTable.tsx` | `selectionCellClassName = 'h-14 p-0'` | line 64 |
| 3 | `src/components/pro/DataTable.tsx` | `bodyCellWithSelectionClassName = 'h-14 py-0'` | line 63 |
| 4 | `src/components/pro/DataTable.tsx` | `selectionSlotClassName = 'flex h-full items-center justify-center'` | line 65 |
| 5 | `src/components/ui/table.tsx` | `[&:has([role=checkbox])]:pr-0` | lines 73, 86 |
| 6 | `src/components/ui/table.tsx` | `[&>[role=checkbox]]:translate-y-[calc(2px*var(--app-scale))]` | lines 73, 86 |

额外同类补丁：`selectionCheckboxClassName = 'size-[calc(16px*var(--app-scale))]'` 位于 `src/components/pro/DataTable.tsx:66`，Step 3 也应随选择列普通化删除。

grep 证据命令：

```bash
rg -n "selectionColumnWidth|selectionCellClassName|bodyCellWithSelectionClassName|selectionSlotClassName|selectionCheckboxClassName|\[role=checkbox\]|translate-y" src/components/pro/DataTable.tsx src/components/ui/table.tsx
```

## 三档截图

截图前断言：

- 页面无 error boundary
- 正确登录态与成员页文本：`成员与部门`、`李长昕`、`账号状态`、`手机号码`
- 当前 zoom 与目标档一致
- 表格至少存在表头全选框 + 行选择框

截图产物：

| 状态 | 显示比例 | 文件 |
| --- | --- | --- |
| 未选中 | 90% (`zoom=sm`) | `test-results/baseline-datatable/users-members-sm.png` |
| 未选中 | 100% (`zoom=md`) | `test-results/baseline-datatable/users-members-md.png` |
| 未选中 | 108% (`zoom=lg`) | `test-results/baseline-datatable/users-members-lg.png` |
| 半选态 | 90% (`zoom=sm`) | `test-results/baseline-datatable/users-members-sm-half.png` |
| 半选态 | 100% (`zoom=md`) | `test-results/baseline-datatable/users-members-md-half.png` |
| 半选态 | 108% (`zoom=lg`) | `test-results/baseline-datatable/users-members-lg-half.png` |

结构化截图 manifest：`test-results/baseline-datatable/manifest.json`。

## 对齐数值基线

数值含义：`deltaToCellCenter = checkbox input 中心 Y - 所在 th/td 中心 Y`。负数表示 checkbox 中心略高于单元格中心。

| 状态 | 显示比例 | 表头 checkbox delta | 第 1 行 checkbox delta | 第 2 行 checkbox delta |
| --- | --- | ---: | ---: | ---: |
| 未选中 | 90% | -0.2578px | 0px | 0px |
| 未选中 | 100% | -0.25px | 0px | 0px |
| 未选中 | 108% | -0.25px | -0.0078px | -0.0078px |
| 半选态 | 90% | -0.2578px | 0px | 0px |
| 半选态 | 100% | -0.25px | 0px | 0px |
| 半选态 | 108% | -0.25px | -0.0078px | -0.0078px |

当前视觉上主要靠 6 处补丁互相抵消维持对齐。后续验收不是只看数值，而是要求这些补丁全部消失后，选择列作为普通列仍在三档与半选态下不退化。
