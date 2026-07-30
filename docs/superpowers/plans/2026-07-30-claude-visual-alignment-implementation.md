# Claude Design 视觉全面对齐实施计划

日期：2026-07-30

设计依据：`docs/superpowers/specs/2026-07-29-claude-reference-compact-default-design.md`

目标：在不改变业务行为、路由协议、接口契约和架构分层的前提下，把 Claude Design 的紧凑比例翻译为共享 token、UI/Pro 组件和全量生产页面契约。

## 执行原则

- 每批先补守卫或组件测试，再修改实现。
- 每批独立验证、独立提交；上一批未绿不进入下一批。
- 视觉几何只进入共享 token、UI 或 Pro，业务页面只做布局和业务组合。
- `--app-scale` 继续作为 90% / 100% / 108% 显示比例轴，不使用 CSS `zoom`。
- 四种 flavor 共享密度，flavor 只改变颜色、圆角、阴影与排印气质。
- `banking-vsa/` 是独立嵌套仓库，始终排除在父仓库提交之外。

## 批次 A：守卫与几何真相源

- [x] 新增共享几何 token 合同测试。
- [x] 新增 flavor 禁止覆盖密度 token 守卫。
- [x] 新增 Card spacing 语义和消费者守卫。
- [x] 新增业务页面视觉越权棘轮。
- [x] 落地 Shell、Page、Table、Choice、Card、Metric、Detail 共享 token。
- [x] 移除 Claude、Shadcn、Sera 的密度覆盖。
- [x] 更新 `docs/design/*.design.md` 的统一密度说明。
- [x] 运行 focused tests、`theme:guard`、`design:lint` 后提交。

## 批次 B：Shell 与基础控件

- [x] ShellHeader、Sidebar、Inset、Rail 全部消费共享几何 token。
- [x] 导航、Sidebar Header、折叠入口和用户入口统一比例。
- [x] Button、Input、Select、Checkbox、Popover、Dropdown 统一紧凑几何。
- [x] `/dev/theme-states` 补齐基础控件状态。
- [x] 运行组件测试、三布局浏览器 smoke 后提交。

## 批次 C：DataTable 与筛选

- [x] DataTable 表头、正文、选择列、行操作和分页统一契约。
- [x] 新增 `DataToolbar` 并收敛 SearchField、FilterSelect、AdvancedFilter。
- [x] 运单列表移除大 KPI 卡，迁移为紧凑 Summary Strip。
- [x] 用户与部门页面迁移并回证树表密度。
- [x] 验证 1440×900 首屏不少于 10 行后提交。

## 批次 D：详情工作台

- [ ] 演进 `PageScaffold`，新增 DetailWorkspace、DetailHeader、DetailSection、DetailAside。
- [ ] 收敛 `DescriptionList` 为紧凑多列字段。
- [ ] 运单详情迁移为主工作区 + 296px 侧栏。
- [ ] customers、channels、carriers、suppliers 详情反向验证。
- [ ] 验证 1440×900 首屏信息覆盖和 1024px 重排后提交。

## 批次 E：Dashboard 与 Metric

- [ ] 先检查 Coss，再实现或 copy-in 并 token 化 Metric。
- [ ] Dashboard 和 Lastmile Overview 迁移统一 Metric。
- [ ] 移除大图标底座、业务内联视觉状态和裸按钮。
- [ ] 列表页 KPI 全部降级为 Summary Strip 或移除。
- [ ] 运行组件测试和浏览器视觉回证后提交。

## 批次 F：全量生产页面迁移

- [ ] Admin 全部页面迁移。
- [ ] Lastmile 全部列表、详情、表单迁移。
- [ ] Auth 页面迁移。
- [ ] Dialog、Sheet、Popover、Dropdown、表单特殊状态收敛。
- [ ] 清零本轮定义的页面视觉越权，运行全量测试后提交。

## 批次 G：矩阵验收与收口

- [ ] Feishu 明暗 × 90/100/108 × 五个样板页面。
- [ ] Claude/Shadcn/Sera 明暗 × 100% 风险 smoke。
- [ ] Sidebar/Inset/Rail × 1440/1280/1024 布局 smoke。
- [ ] 运行 TypeScript、ESLint、Vitest、theme guard、design lint、生产构建。
- [ ] 检查构建产物无 faker、msw、mockServiceWorker。
- [ ] 运行 Impeccable detector 和对抗性终审。
- [ ] 把截图、DOM 尺寸和差异结论回填规格并提交。
