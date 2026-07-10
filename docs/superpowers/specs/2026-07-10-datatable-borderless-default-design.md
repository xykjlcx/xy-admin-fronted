# DataTable 默认无外框设计

## 目标

- `DataTable` 在所有 Shell 布局与主题下默认不渲染外边框。
- 保留表头背景、行分隔线、行状态和圆角裁切，不改变数据、选择、分页与交互行为。
- 成员页部门树与主内容区之间只保留一条分隔线，消除默认布局下的双边框。

## 根因

- `DataTable` 外层同时声明 `border` 与 `border-(--table-shell-border)`；inset 布局仅把 token 改为透明，其他布局仍显示外框，且透明边框仍占据 1px 几何空间。
- `DeptTree` 的右边框与 `MembersScene` 主内容区的左边框位于同一边界，默认布局下叠加为 2px。

## 设计

1. 从 `DataTable` 外层容器移除外框相关 class，保留 `overflow-hidden`、圆角和背景。
2. 不修改 `TableShell`。本次需求只收敛 TanStack `DataTable` 的默认外观，避免扩大到另一套公开表格骨架。
3. 从 `DeptTree` 移除右边框，让 `MembersScene` 继续以条件左边框唯一拥有分栏边界；这样默认布局为单条标准分隔线，inset 布局仍使用较弱的 `--page-section-divider`。
4. 不新增 `bordered` 属性，不保留布局或业务层覆盖入口。

## 测试与验收

- 先增加失败测试，断言 `DataTable` 默认外层没有 border class 或 `--table-shell-border` 依赖。
- 增加成员页结构守卫，断言部门树不再提供右边框，主内容区仍按 `showDeptTree` 提供唯一左分隔线。
- 更新相关 token snapshot，保留 `TableShell` 对 `--table-shell-border` 的合法使用。
- 运行 `tsc`、ESLint、Vitest、`theme:guard`、`design:lint`。
- 在默认与 inset 布局下用浏览器检查：DataTable 四边 computed border width 为 `0px`；部门树/主内容边界只有一条 1px 分隔线；页面无新增溢出或布局偏移。

## 非目标

- 不移除表格内部行分隔线。
- 不改变 `TableShell`、分页、工具栏、表格密度或主题 token 的其他语义。
- 不处理当前工作区中菜单管理与本地化文件的既有改动。
