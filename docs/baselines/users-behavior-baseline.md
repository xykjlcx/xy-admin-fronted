# Users 行为基线

生成时间：2026-07-05 17:35 CST

基线对象：`/admin/users?page=1&pageSize=10&status=all&keyword=`。

> ⚠️ **历史快照（users 纵切改造前）**：本文所述路径 `src/modules/admin/pages/users/` 已删除，实现迁至 `src/modules/admin/users/`（api/list/detail/form）。本文仅作改造前行为的历史参考，不反映当前实现（见 `SPEC-datatable-tanstack.md` §3.3「不得复用、只作历史参考」）。

## 环境与脚本

- Node：`v24.12.0`
- 包管理器：`pnpm`
- 本地服务：复用 `http://localhost:5173`，进程 cwd 为 `/Users/ocean/Documents/通用脚手架前端`
- 依赖已存在：`react-hook-form`、`zod`、`@tanstack/react-query`、`@tanstack/react-router`、`msw`、`@faker-js/faker`
- package scripts：`test=vitest run`、`theme:guard=vitest run src/styles/__tests__/theme-guards.test.ts src/styles/__tests__/tokens.snapshot.test.ts src/app/__tests__/module-boundaries.test.ts`、`design:lint=node scripts/design-md-lint.mjs`、`visual=node scripts/visual-agent-browser.mjs all`
- `pnpm visual` 结果：已生成 app/prototype 截图，但在 scale 检查阶段失败，错误为 `status popover not found`。按 SPEC fallback 额外使用 Agent Browser 采集 users 三 tab × 三档基线到 `test-results/baseline-users/`。

## 数据锚点

- 部门查询：`deptsQuery`
  - 当前 queryKey：`['iam', 'depts']`
  - 请求路径：`GET /api/depts`
  - 返回：部门数组，mock 会按非离职成员动态计算 `memberCount`
- 成员列表查询：`usersQuery(search)`
  - 当前 queryKey：`['iam', 'users', params]`
  - 请求路径：`GET /api/users`
  - 参数：`page`、`pageSize`、`status`、`deptId`、`directOnly`、`keyword`
  - `placeholderData: keepPreviousData`，刷新时保留旧表格并显示 `正在更新`
- 当前详情：无独立详情请求
  - 当前详情抽屉直接使用列表行 `UserDto`
  - 当前无 `GET /api/users/:id` handler
- 写操作：
  - 新建：`POST /api/users`，返回创建后的用户
  - 编辑：`PUT /api/users/:id`，返回更新后的用户
  - 删除：`DELETE /api/users/:id`，返回 `null`
  - 批量禁用：`POST /api/users/batch-disable`，返回 `{ updated }`
  - 当前所有 mutation 成功后只 `invalidateQueries({ queryKey: ['iam', 'users'] })`，不失效 `['iam', 'depts']`

## 三个 Tab

- 成员 tab：
  - 默认 active，URL `status=all`
  - 左侧部门树始终显示，默认选中 `全部成员`
  - 默认列表排除 `left` 状态成员，mock 当前总数 `14`
  - 每页 `10` 条，第 1 页显示 `李长昕` 到 `黄志强`
  - 空态：筛选无结果时内容区显示 `暂无成员`，仍显示部门树和分页总数 `共 0 名成员`
  - 加载态：表格区域显示 `正在加载成员` 与 6 行 skeleton，页面外壳和部门树保持可见
  - 刷新态：保留旧表格并显示 `正在更新`
- 部门 tab：
  - URL 不单独记录 tab，tab 是页面本地 UI 状态
  - 左侧部门树仍显示
  - 右侧显示 `组织架构 / 管理企业部门层级`
  - 表格列为 `部门`、`成员数`
  - 当前部门行：产品研发中心 6 人、前端组 2 人、后端组 2 人、测试组 1 人、市场营销部 2 人、人力资源部 2 人、财务部 2 人、行政部 2 人
- 已离职成员 tab：
  - 切换后 URL 变为 `status=left&page=1`
  - 不显示账号状态筛选、直属成员筛选、新建按钮
  - 当前显示 `徐若琳`、`唐一鸣`，总数 `2`
  - 当前实现仍显示行内 `详情`、`编辑`、删除图标操作

## 部门树

- 左侧搜索框 placeholder 为 `搜索部门`
- 根入口 `全部成员` 的计数为根部门成员数汇总，当前 `14`
- 部门计数来自 `/api/depts`，不受当前右侧列表筛选 total 影响
- 搜索部门只过滤部门树，不过滤右侧成员列表；搜索后仍保留 `全部成员` 入口
- 点击 `全部成员`：
  - `deptId` 从 URL search 中移除
  - `directOnly` 同时被移除
  - 直属成员按钮禁用
- 点击根部门 `产品研发中心`：
  - URL 增加 `deptId=rd&page=1`
  - 默认包含子部门成员，当前总数 `6`
  - 直属成员按钮启用
- 点击子部门：
  - URL 增加对应 `deptId`
  - 子部门没有更深后代时，默认递归范围与直属范围等价

## 筛选

- 状态筛选：
  - 只在成员 tab 显示
  - 选项来自 `statusOptions`：`all`、`active`、`disabled`、`unactivated`
  - 切换时调用 `onSearchChange({ status, page: 1 })`
  - `status=all` 在 mock 中排除 `left`
  - `status=disabled` 当前只显示 `郑晓琳`
- 直属成员：
  - 未选部门时禁用
  - 已选部门时点击写入 `directOnly=true&page=1`
  - 对根部门 `rd`，默认递归总数 `6`；直属筛选后只显示 `李长昕`，总数 `1`
  - 再次点击写入 `directOnly=false&page=1`；路由层会删除 false 值
- 关键词：
  - 当前页面没有成员关键词搜索框；只有 URL `keyword` 参与查询
  - `keyword=王` 当前只显示 `王思远`
  - mock 在 `name`、`role`、`phone`、`email` 中做小写包含匹配

## 成员表与分页

- 列顺序：选择框、姓名、账号状态、手机号码、部门、操作
- 头像颜色由行内 index 轮换，文字为姓名后两字
- 状态 badge：`active=正常`、`disabled=停用`、`unactivated=未激活`、`left=已离职`
- 分页：
  - 页码来自 URL search 的 `page`
  - 总页数为 `Math.max(1, Math.ceil(total / pageSize))`
  - 默认 `pageSize=10`
  - `下一页` 写入 `{ page: 2 }`
- 行选择：
  - 支持单行选择和选择本页
  - 当前选择 scope 包含 `activeTab`、`status`、`deptId`、`directOnly`、当前页 id 列表
  - 筛选/分页触发 `patchSearch` 时立即清空选择
  - 数据换页导致当前页 id 列表变化时，选择也被视为失效
  - 当前实现不保留跨页选择；批量条只统计当前可见选中 id
- 批量禁用：
  - 有选中且具备 `iam:user:resign` 权限时出现批量条
  - 文案为 `已选 {{count}} 人` 和按钮 `批量禁用`
  - 提交调用 `POST /api/users/batch-disable`
  - 成功后清空选择，并通过 users query 失效刷新列表

## 新建、编辑、删除、详情

- 新建：
  - 入口：成员 tab 且具备 `iam:user:create` 权限时显示 `添加成员`
  - 弹窗标题：`添加成员`
  - 字段：姓名、选择部门、角色、手机号、邮箱
  - 当前校验：保存按钮仅受 `name`、`role`、`phone`、`email` 非空控制；`deptId` 为空时提交前回退到第一个部门 id；邮箱格式不在 UI 层校验
  - 成功后关闭弹窗，失效 `['iam', 'users']`
- 编辑：
  - 入口：行内 `编辑`，受 `iam:user:update` 权限控制
  - 弹窗标题：`编辑成员`
  - 字段同新建，初始值来自当前行 DTO
  - 成功后关闭弹窗，失效 `['iam', 'users']`
- 删除：
  - 入口：行内删除图标，aria 文案为 `删除{{name}}`，受 `iam:user:del` 权限控制
  - 确认弹窗标题：`确认删除成员`
  - 描述：`删除后该成员会从当前列表移除。`
  - 确认按钮：`确认删除`
  - 成功后关闭确认框，失效 `['iam', 'users']`
- 详情：
  - 入口：行内 `详情`
  - 当前打开 `UserDetailSheet`
  - 数据来自当前列表行 DTO，不重新请求
  - 展示项：部门、角色、联系方式（phone + email）、状态

## 视觉基线

Agent Browser 截图前断言了页面关键文本、登录态、显示比例与目标 tab：

- `test-results/baseline-users/users-members-sm.png`：成员 tab，90%
- `test-results/baseline-users/users-members-md.png`：成员 tab，100%
- `test-results/baseline-users/users-members-lg.png`：成员 tab，108%
- `test-results/baseline-users/users-depts-sm.png`：部门 tab，90%
- `test-results/baseline-users/users-depts-md.png`：部门 tab，100%
- `test-results/baseline-users/users-depts-lg.png`：部门 tab，108%
- `test-results/baseline-users/users-left-sm.png`：已离职成员 tab，90%
- `test-results/baseline-users/users-left-md.png`：已离职成员 tab，100%
- `test-results/baseline-users/users-left-lg.png`：已离职成员 tab，108%

## Step 0 SPEC-QUESTION

- SPEC §6.2 要求 `variant='left'` 时 `onEdit/onDelete` 传 `undefined` 以隐藏写操作；但当前行为基线显示已离职成员 tab 仍有 `编辑` 和删除图标。后续如果严格按 SPEC 隐藏，会与 Step 0 行为基线不一致，需要裁决以哪个为准。
