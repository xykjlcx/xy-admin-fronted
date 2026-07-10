# 角色列表 Hover 性能修复设计

## 问题

角色与权限页面左侧角色列表在快速移动指针时，hover 背景变化有明显拖影和迟滞。

浏览器实测角色按钮的 `background-color` 过渡时长为 150ms。角色行继承 `Button` 基础过渡，同时业务层再次声明 `transition-colors`；连续扫过列表时，相邻行的淡入与淡出会重叠，形成卡顿感。角色行没有 hover 状态驱动的 React 逻辑，因此问题属于高频列表行的 CSS 动效不当，而不是组件重渲染。

## 方案

- 仅在 `RoleListPanel` 的角色行上使用 `transition-none`。
- 保留现有 hover、选中、点击、焦点和权限行为，只取消行级颜色插值。
- 不修改全局 `Button`，避免影响普通按钮、弹窗操作和其他低频交互。
- 不修改全局动效时长 token。

## 验收标准

1. 角色行不包含 `transition-colors`，并显式包含 `transition-none`。
2. 快速划过角色列表时，背景立即切换，不再出现 150ms 拖影。
3. 当前角色的选中背景保持稳定。
4. 点击其他角色仍能切换详情。
5. 角色模块测试、类型检查、Lint 和主题守卫按当前工作区事实执行并记录结果。

## 测试策略

- 先在 `RolesView.test.tsx` 增加角色行 hover 动效约束并验证 RED。
- 最小修改 `RoleListPanel.tsx` 后验证 GREEN。
- 使用真实浏览器读取计算样式，确认 `transition-property: none`，并连续 hover 多行验证不再触发 `background-color` transition。
