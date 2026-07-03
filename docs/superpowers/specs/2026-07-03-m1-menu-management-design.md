# M1-B 菜单管理设计规格

## 目标

实现 `/admin/menus` 菜单管理页面，让后台管理员可以维护后台管理子系统内的导航目录、菜单入口和按钮级权限动作。

视觉层面对齐 `后台管理脚手架.dc.html` 的 Menu Management 原型：面包屑、子系统区域、菜单树工具栏、树形表格、显示开关、行操作。实现层面不复制原型里的 toast-only 行为，而是提供可测试、可维护的真实 CRUD 和校验边界。

## 范围

本阶段交付：

- 新增菜单管理路由 `/admin/menus`，并接入现有后台导航。
- 后台管理子系统下新增菜单项 `菜单管理`，权限标识为 `iam:menu:view`。
- 菜单树支持目录、菜单、动作三类节点。
- 支持新增、编辑、删除叶子节点、显示/隐藏切换。
- 支持按名称、路由、权限标识搜索。
- 支持展开、折叠树节点。
- 子系统卡片用于维度展示和选择，展示菜单数量与内置状态。
- MSW mock API 提供真实增删改查行为，供前端和测试复用。

本阶段不交付：

- 任意新增子系统并自动注册业务模块。原因是子系统不是纯数据配置，它还依赖前端路由、权限、模块代码和默认首页注册。先做数据按钮会制造“看起来可配置、实际不可运行”的假能力。
- 远程后端集成。M1 仍以 typed API + MSW contract 收口。

## 字段模型

沿用 `MenuRecord` 作为菜单领域实体，补充表单输入契约：

```ts
type ManagedMenuType = 'dir' | 'menu' | 'action'

type CreateMenuInput = {
  subsystemKey: string
  parentId: string | null
  type: ManagedMenuType
  label: string
  icon?: string
  shortLabel?: string
  path?: RoutePath
  permission?: string
  visible: boolean
  sort: number
}
```

字段规则：

- `dir`：用于导航分组，可配置 `icon`、`shortLabel`、`sort`，不要求 `path` 和 `permission`。
- `menu`：用于页面入口，必须配置有效 `path`，建议配置 `permission`。
- `action`：用于按钮级权限，不进入导航树，不允许配置 `path`，必须配置 `permission`。
- `visible=false`：保留配置但不进入导航渲染。
- `sort`：同父级内升序排列。
- 删除只允许叶子节点；非叶子目录必须先处理子节点。

## UI 结构

页面结构：

1. 面包屑：`组织与权限 / 菜单管理`
2. 子系统区域：
   - 标题 `子系统管理`
   - 子标题 `菜单按子系统隔离；当前阶段子系统由代码注册`
   - 子系统卡片：名称、内置状态、菜单数量、说明
3. 菜单树区域：
   - 标题：`{当前子系统} · 菜单树`
   - 统计：目录数、菜单数、动作数、隐藏数
   - 搜索框
   - 展开、折叠、新增菜单按钮
4. 树形表格：
   - 菜单名称
   - 路由路径
   - 类型
   - 权限标识
   - 显示
   - 操作

组件拆分：

- `MenusView`：页面状态编排、查询结果渲染、 mutation callback 接入。
- `MenuFormDialog`：新增/编辑表单，封装字段校验和类型联动。
- `MenuTreeTable`：纯展示树表，负责缩进、折叠、开关和行操作。
- 菜单管理 view-model：负责树扁平化、统计、搜索和可删除判断。

## 数据流

- 页面通过 `subsystemsQuery` 获取可选子系统。
- 页面通过 `menusQuery(activeSubsystem)` 获取当前子系统菜单。
- 新增、编辑、删除、显示切换走 `menuApi` mutations。
- mutation 成功后失效 `['nav', 'menus']` 前缀，让左侧导航和当前页面同步刷新。
- 页面筛选、展开折叠和弹窗状态保持在组件本地，不写 URL；避免点击部门/菜单筛选导致整页刷新。

## 权限

页面入口：

- `iam:menu:view`

操作权限：

- `iam:menu:create`
- `iam:menu:update`
- `iam:menu:del`
- `iam:menu:toggle`

当前 M1 mock 管理员拥有上述权限；普通 viewer 只可查看。

## 验收

功能验收：

- 管理员可以新增目录、菜单、动作。
- 管理员可以编辑菜单名称、图标、路由、权限标识、显示状态和排序。
- 管理员可以隐藏菜单，隐藏后导航树不再显示该菜单。
- 管理员不能删除非叶子节点。
- viewer 不能看到新增、编辑、删除、显示开关等写操作入口。

视觉验收：

- 桌面视口下整体布局与原型一致：左侧应用导航、顶部栏、内容面板、子系统卡片、树形表格。
- 表格行高、表头、状态徽标、按钮、开关和弹窗与当前 M1 页面视觉语言一致。
- 不使用硬编码十六进制色值；精确尺寸使用 token 或 `--app-scale`。

工程验收：

- API、mock handler、页面组件均有针对性测试。
- `tsc`、`vitest`、`eslint src` 全部通过。
- 使用 Agent Browser 做真实页面走查和截图归档。
