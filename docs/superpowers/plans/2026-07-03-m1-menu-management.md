# M1-B 菜单管理实施计划

## 前置检查

- 确认当前分支为 `feat/m0-scaffold`。
- 确认工作区没有未归属改动。
- 读取菜单原型、现有 `MenuRecord`、`menu.api.ts`、`menu.handlers.ts`、导航渲染链路。

## Step 1：先写失败测试

新增或扩展以下测试：

- `src/modules/admin/mocks/__tests__/menu.handlers.test.ts`
  - `POST /api/menus` 可以新增菜单节点。
  - `PUT /api/menus/:id` 可以编辑字段。
  - `PATCH /api/menus/:id/visibility` 可以切换显示状态。
  - `DELETE /api/menus/:id` 可以删除叶子节点。
  - `DELETE /api/menus/:id` 拒绝删除非叶子节点。

- `src/modules/admin/components/menus/__tests__/MenusView.test.tsx`
  - 渲染子系统卡片、菜单树标题和核心列。
  - 搜索关键字只过滤树表，不触发路由刷新。
  - 管理员可以打开新增、编辑弹窗并提交。
  - 管理员可以切换显示状态。
  - viewer 只读，不显示写操作。

## Step 2：补菜单 API 契约

编辑 `src/modules/admin/api/menu.api.ts`：

- 增加 `CreateMenuInput`、`UpdateMenuInput`、`SetMenuVisibilityInput`。
- 增加 `menuApi.createMenu`、`updateMenu`、`deleteMenu`、`setMenuVisibility`。
- 保持现有 `subsystemsQuery`、`menusQuery` 查询契约不变。

## Step 3：补 MSW 行为

编辑 `src/modules/admin/mocks/menu.handlers.ts`：

- 复用现有内存 collection。
- 新增菜单时校验：
  - 子系统存在。
  - 父级存在且属于同一子系统。
  - `menu` 必须有 path。
  - `action` 必须有 permission 且不能有 path。
- 编辑菜单时保持同样校验。
- 删除时拒绝非叶子节点。
- 返回结构化错误，页面侧用 toast 展示。

## Step 4：接入路由与导航

- 新增 `src/routes/_auth/admin/menus.tsx`。
- 在后台管理菜单 manifest 中新增 `菜单管理` 节点。
- 增加菜单管理相关权限 action 节点。
- 扩展 icon registry，支持菜单页需要的 `menu`、`list`、`folder`、`user` 等图标。
- 补充 zh/en 文案。

## Step 5：实现 UI 组件

新增 `src/modules/admin/components/menus/`：

- `MenusView.tsx`
- `MenuFormDialog.tsx`
- `MenuTreeTable.tsx`
- `menu-management-model.ts`

UI 约束：

- 页面外壳沿用 M1 现有后台布局和 token。
- 树表列宽稳定，行高稳定，checkbox/switch 不使用原生默认样式。
- 写操作按钮按权限显隐。
- 子系统卡片只做选择和信息展示，不做假 CRUD。

## Step 6：视觉验收

- 扩展 `scripts/visual-agent-browser.mjs`，增加菜单管理 prototype/app 场景。
- 使用 Agent Browser 打开本地页面。
- 截图归档到 `artifacts/visual/m1-menus/`。
- 对照原型检查：
  - 页面结构
  - 子系统区域
  - 树形表格缩进
  - 开关/按钮/弹窗
  - 90% / 100% / 108% scale

## Step 7：多角色审查

按以下角色审查并直接修复明确问题：

- 规格审：字段、权限、CRUD 边界是否闭合。
- UI 审：是否贴近原型，是否符合当前后台视觉语言。
- 架构审：API、mock、route、component 是否分层清晰。
- 工程规则审：token、颜色、rounding、query ownership、测试覆盖、lint。

## Step 8：最终验证与提交

必须运行：

```bash
./node_modules/.bin/tsc -b --noEmit
./node_modules/.bin/vitest run
./node_modules/.bin/eslint src
```

通过后提交：

```bash
git add docs src scripts artifacts
git commit -m "feat: 实现菜单管理页面"
```
