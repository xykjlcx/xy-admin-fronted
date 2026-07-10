# 菜单管理边界优先重构设计

日期：2026-07-10

## 1. 背景与结论

`src/modules/admin/menus/` 已迁移为纵切目录，但实现内部仍把数据访问、Mutation、页面状态、菜单树、详情编辑、子系统表单、响应式容器、视觉样式和 Mock 规则集中在少数大文件中。当前最突出的问题是：

- `list/MenusScene.tsx` 同时承担数据容器、页面编排、多个业务组件和大量视觉实现；
- 菜单详情内联编辑与 `MenuFormDialog` 形成两套表单、校验和 DTO 转换；
- Schema、表单校验和 Mock 校验没有形成单一规则源；
- 路由选项和新子系统首页包含 Admin 特例；
- 业务组件直接实现颜色、边框、圆角、状态和动画；
- 单个巨型测试文件大量断言 Tailwind class 和 DOM 结构，反向固化当前实现。

本轮采用“边界优先重构”，不是机械拆文件，也不引入完整状态机或新的通用工作台框架。

## 2. 目标

1. 让每个文件只有一个清楚职责，生产组件原则上不超过 250 行，`MenusScene` 控制在约 150 行。
2. 统一菜单新增与编辑流程，删除两套表单语义。
3. 让 Zod Schema 成为请求 DTO 和表单规则的唯一类型源。
4. 让业务文件只保留布局类；视觉状态下沉到既有 UI/Pro 组件。
5. 删除硬编码 Admin 路由和默认首页特例，使模块注册后可自动进入菜单配置能力。
6. 让 Mock handler 只负责 HTTP 适配，跨记录业务规则可独立测试。
7. 让测试围绕行为和边界，而不是围绕当前 Tailwind class 和 DOM 层级。

## 3. 非目标

- 不改变后端权限是最终安全边界的既有定位。
- 不改写全局 Shell 导航模型或模块 manifest 协议。
- 不引入 XState、表单生成器或新的全局状态库。
- 不为了本页面创建只能被 menus 使用的伪通用组件。
- 不修改 menus 之外的业务功能；对 UI/Pro 的改动只限于 menus 已需要且符合现有职责的能力补齐。

## 4. 目标目录与职责

```text
src/modules/admin/menus/
├── index.tsx
├── types.ts
├── model.ts
├── api/
│   ├── schema.ts
│   ├── keys.ts
│   ├── menu.ts
│   └── index.ts
├── list/
│   ├── MenusScene.tsx
│   ├── MenusView.tsx
│   ├── MenuWorkspace.tsx
│   ├── MenuTree.tsx
│   └── SubsystemSwitcher.tsx
├── detail/
│   ├── MenuInspector.tsx
│   └── MenuActionList.tsx
├── form/
│   ├── useMenuForm.ts
│   ├── MenuFormDialog.tsx
│   ├── useSubsystemForm.ts
│   └── SubsystemFormDialog.tsx
├── components/
│   └── index.ts
├── mocks/
│   ├── db.ts
│   ├── menu-rules.ts
│   ├── menu.handlers.ts
│   └── index.ts
└── __tests__/
```

- `index.tsx`：只导出 `MenusPage`，不再把测试用的内部 View 作为模块公共 API。
- `types.ts`：只放 Overlay、Capabilities、Commands 等 UI 状态类型。
- `model.ts`：只放纯树构建、搜索、父子关系、排序和选中项解析。
- `MenusScene.tsx`：请求、Mutation、缓存失效和 toast；不持有业务页面 UI 状态。
- `MenusView.tsx`：状态归属和语义事件编排；不直接实现大块视觉结构。
- `MenuWorkspace.tsx`：主从工作区和响应式容器组合。
- `MenuTree.tsx`：把菜单领域数据适配成 Pro Tree 输入，不实现树的视觉状态机。
- `detail/`：只处理选中节点展示与动作节点列表。
- `form/`：RHF 表单 hook 与 Dialog 展示分离。
- `menu-rules.ts`：Mock 服务端需要访问同级数据才能判断的规则，例如父节点合法性、循环引用和非叶子删除。

`components/` 本轮保持空目录，不为了目录完整而制造无消费方组件。

## 5. 数据契约与领域规则

### 5.1 判别联合

菜单写入契约按 `type` 建立判别联合：

- `dir`：`parentId` 必须为 `null`，无 `path`，权限可空；
- `menu`：父级可为目录或根级，必须有合法路由路径；
- `action`：必须挂在菜单下，必须有权限标识，不允许路由。

`CreateMenuInput`、`UpdateMenuInput` 和表单提交值均从 Schema 使用 `z.infer` 推导。全局 `MenuRecord`/`Subsystem` 继续保留在 `modules/types.ts`，因为它们是 manifest 与 Shell 共用的跨模块契约；menus API 不再手写重复 DTO。

### 5.2 跨记录规则

以下规则不能只靠单条 Schema 判断，保留在 Mock 服务端规则层：

- 父节点必须存在且属于同一子系统；
- 父节点类型必须匹配；
- 父级不能指向自身或后代；
- 有子节点时不能修改节点类型；
- 非叶子节点不能删除。

后代判断改成带 `visited` 的迭代遍历，避免异常数据形成递归死循环。

### 5.3 路由目录

删除 `model.ts` 中的 Admin 路由白名单。菜单可选路由由已注册模块 manifest 的页面菜单声明生成，使用 manifest 的本地化 label 和编译期 `RoutePath`。新增子系统必须明确选择首页，不再隐式写入 `/admin/dashboard`。

### 5.4 缓存

- 子系统列表属于准静态数据，保留长 `staleTime` 并在写操作后显式失效；
- 菜单列表属于易变配置，使用默认 stale 策略；
- 写操作统一失效 `menuKeys.menuLists()`；子系统写操作额外失效 `menuKeys.subsystems()`；
- Shell 与菜单管理继续通过相同 `nav` key 前缀共享缓存。

## 6. UI、状态与交互

### 6.1 编辑流程

- 目录、页面和动作全部使用同一个 `MenuFormDialog`；
- 详情面板不再维护独立 draft，只展示基本信息、可见性开关和语义操作；
- 页面动作仍不进入导航树，只在所属页面详情内展示；
- 所有叶子节点使用同一删除规则，不再按节点类型特判。

### 6.2 页面状态

独立状态继续使用独立 `useState`：关键字、折叠节点、当前节点和窄屏详情开关。

互斥覆盖层合并为判别联合：

```ts
type MenuOverlay =
  | { kind: 'none' }
  | { kind: 'menu-form'; state: MenuFormState }
  | { kind: 'subsystem-form'; state: SubsystemFormState }
  | { kind: 'delete'; menu: MenuRecord };
```

这样不会同时出现菜单弹窗、子系统弹窗和删除确认框。

### 6.3 子系统切换

子系统切换使用现有 `PageTabs` 语义，编辑当前子系统和新增子系统作为相邻工具栏动作。删除专属卡片视觉及其页面级 hover、边框、阴影和绝对定位逻辑。

### 6.4 样式下沉

本轮只补齐既有 Pro 组件：

- `Tree`：支持展开状态、前导内容、元信息、尾部动作和隐藏动画；
- `DescriptionList`：支持紧凑双列和可选标题/操作；
- `FormDialogContent`：支持 loading、错误提示和内容宽度；
- `PageScaffold`：补齐主从 Pane/Header 所需的通用表面能力。

menus 业务组件只保留 `flex/grid/gap/min-h/overflow` 和响应式显隐等布局类。颜色、圆角、边框、阴影、hover、focus、selected、动画和任意像素尺寸必须位于 UI/Pro。

凡修改 UI/Pro，必须同步 `/dev/theme-states` 状态矩阵、主题 guard 和对应组件测试。

## 7. 表单

- `useMenuForm` 和 `useSubsystemForm` 使用 React Hook Form + `zodResolver`；
- Dialog 只渲染字段和语义按钮，不持有手写 draft；
- 类型切换和父级切换只更新受影响字段与下一个兄弟排序；
- 编辑本地化字段时只覆盖当前 locale，保留其他语言；
- 提交失败保留 Dialog 和输入值；
- pending 时保存按钮禁用并显示 loading，阻止重复提交；
- 子系统表单增加首页字段，颜色继续沿用统一默认 token，编辑时保留既有值。

## 8. 测试设计

先写失败测试，再修改生产代码。测试拆分为：

- `menu-model.test.ts`：树、搜索、折叠、排序、后代与选择回退；
- `menu-form.test.tsx`：三种节点契约、双语保留、pending 和失败恢复；
- `subsystem-form.test.tsx`：key、首页、双语和重复提交；
- `menus-permissions.test.tsx`：查看、新增、编辑、删除和可见性能力；
- `menus-workflow.test.tsx`：子系统切换、节点选择、动作管理、统一编辑和删除；
- `menu-rules.test.ts`：跨记录 Mock 规则；
- API 与 handler 测试继续验证读写回读和错误响应；
- 纵切 guard 验证目标目录、单一公开入口、表单技术栈与禁止硬编码路由。

业务测试不再断言具体 Tailwind class、圆角、背景色和内部 DOM 层级。视觉状态由 Pro 组件测试、主题 guard 与浏览器截图负责。

## 9. 实施顺序

1. 增加结构、Schema、model 和 Mock 规则的失败测试；
2. 收口 Schema、路由目录和 Mock handler；
3. 增加 RHF 表单失败测试并迁移两个表单；
4. 补齐 Pro 能力及主题状态矩阵；
5. 拆分详情、树、子系统切换和工作区；
6. 收口 `MenusScene`/`MenusView` 状态与命令；
7. 删除内联编辑、硬编码路由和旧测试结构；
8. 运行全量门禁与三档显示比例视觉验证。

每个 TDD 循环先看到目标测试因缺少新行为而失败，再写最小实现使其通过。

## 10. 完成标准

- menus 生产组件原则上不超过 250 行，`MenusScene` 不再包含业务详情或表单 JSX；
- 只有一套菜单写入表单和 DTO 转换；
- 表单无 `useState` draft，无 DTO 类型断言；
- 无硬编码 Admin 路由列表和 `/admin/dashboard` 新子系统默认值；
- `MenuTree` 不处理动作节点特例；
- Mock 请求使用 Schema 解析，不直接断言 JSON 类型；
- menus 业务组件不包含视觉状态类和 `style={{...}}`；
- 测试按职责拆分，不以业务测试锁定 Tailwind 实现；
- 保持子系统切换、CRUD、可见性、权限、非叶子保护、双语合并和窄屏详情能力；
- 通过以下门禁：

```bash
./node_modules/.bin/tsc -b --noEmit
./node_modules/.bin/eslint src
./node_modules/.bin/vitest run
pnpm theme:guard
pnpm design:lint
```

涉及生产构建时追加 `tsc -b && vite build`，并检查产物不包含 `faker|msw|mockServiceWorker`。UI 收口完成后运行 `pnpm visual` 验证 90% / 100% / 108%。
