# DataTable Final Evidence

生成时间：2026-07-06T05:14:14.643Z

本文件是 DataTable TanStack 迁移后的可追踪最终证据摘要。原始截图与浏览器产物仍在 `test-results/`，该目录按仓库规则不作为唯一记录。结构化原始摘要见 `docs/baselines/datatable-final-evidence.json`。

## Checkbox 对齐

数值含义：`deltaToCellCenter = checkbox input 中心 Y - 所在 th/td 中心 Y`。

| 状态 | 显示比例 | Step 0 delta（表头 / 第1行 / 第2行） | Final delta（表头 / 第1行 / 第2行） | 最大绝对退化 |
| --- | --- | ---: | ---: | ---: |
| unchecked | 90% (sm) | -0.2578 / 0 / 0 | -0.25 / 0 / 0 | 0px |
| half-selected | 90% (sm) | -0.2578 / 0 / 0 | -0.25 / 0 / 0 | 0px |
| unchecked | 100% (md) | -0.25 / 0 / 0 | -0.25 / 0 / 0 | 0px |
| half-selected | 100% (md) | -0.25 / 0 / 0 | -0.25 / 0 / 0 | 0px |
| unchecked | 108% (lg) | -0.25 / -0.0078 / -0.0078 | -0.2578 / -0.0078 / -0.0078 | 0.0078px |
| half-selected | 108% (lg) | -0.25 / -0.0078 / -0.0078 | -0.2578 / -0.0078 / -0.0078 | 0.0078px |

结论：90% 改善，100% 持平，108% 只有 0.0078px 亚像素差异；未出现可见 2px 偏移类退化。

## 行为证据

| 步骤 | checkbox 数 | 表头状态 | checked 数 | 批量入口 | 选中文案 |
| --- | ---: | --- | ---: | --- | --- |
| initial | 11 | unchecked | 0 | 隐藏 | - |
| single-select | 11 | indeterminate | 1 | 显示 | 已选 1 人 |
| select-all-page | 11 | checked | 11 | 显示 | 已选 10 人 |
| after-page-change | 5 | unchecked | 0 | 隐藏 | - |
| before-filter-change | 11 | indeterminate | 1 | 显示 | 已选 1 人 |
| after-status-filter-change | 2 | unchecked | 0 | 隐藏 | - |

结论：单选、半选、全选本页、翻页清空、筛选清空、详情/编辑/删除入口均有浏览器证据。跨页累积删除是 SPEC §0.6 的有意变更。

## 视觉口径

`pnpm visual` 全页 prototype diff 保留为辅助信息，不作为本次 DataTable 局部硬门槛；当前全页差异包含既有原型/实现差异。

| 页面 | 全页 diff | 像素 |
| --- | ---: | ---: |
| login | 3.25% | 42159/1296000 |
| dashboard | 5.39% | 69845/1296000 |
| users | 5.64% | 73076/1296000 |
| roles | 5.1% | 66131/1296000 |
| menus | 6.53% | 84613/1296000 |

三档 scale checks：sm: no horizontal overflow / status popover in viewport / detail sheet in viewport / roles dialog in viewport / menus dialog in viewport；md: no horizontal overflow / status popover in viewport / detail sheet in viewport / roles dialog in viewport / menus dialog in viewport；lg: no horizontal overflow / status popover in viewport / detail sheet in viewport / roles dialog in viewport / menus dialog in viewport。
