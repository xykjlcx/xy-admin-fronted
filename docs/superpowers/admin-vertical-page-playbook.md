# Admin 纵切页面交付 Playbook

## 1. 适用范围

新增或迁移 `modules/<key>/<business>/` 业务页面时，统一复制 `modules/admin/users/` 的纵切边界。本 Playbook 约束目录、数据流、Mock、权限、国际化和验收，不提供第二种“简单页面”结构。

## 2. 标准目录

```text
modules/<key>/<business>/
├── index.tsx
├── api/
│   ├── index.ts
│   ├── keys.ts
│   ├── schema.ts
│   └── <business>.ts
├── mocks/
│   ├── db.ts
│   ├── index.ts
│   └── __tests__/
├── list/
├── detail/
├── form/
├── components/
├── model.ts
├── types.ts
└── __tests__/
```

- `index.tsx` 只组装场景，不请求数据、不持有业务数据。
- DTO 与请求入参由 `api/schema.ts` 的 Zod schema 推导。
- 所有 Query Key 来自 `api/keys.ts` factory。
- 简单业务也保留相同骨架；无内容目录可以保留空入口。
- 不在 `modules/<key>/pages`、`modules/<key>/api`、`modules/<key>/mocks` 新增横切业务实现。

## 3. 数据与状态归属

1. Scene 或直接消费数据的子组件调用同一份 `queryOptions`，由 TanStack Query 去重。
2. 写操作成功后按 `<business>Keys.all` 或精确前缀失效；不把服务端数据复制进 Zustand。
3. 详情只存 `id`，详情组件用 `detailQuery(id)` 请求完整数据。
4. 筛选条件优先进入 URL search；弹窗、删除目标、当前选择放在其最近公共父。
5. 表格分页和选择使用 `DataTable` API，不自建分页或 Checkbox 状态机。

## 4. 路由、导航与权限

- `routes/` 只负责 URL、`validateSearch`、`staticData`、loader/context 适配和语义回调。
- 路由禁止 Query/Mutation、toast、i18n 和业务子组件拼装。
- 页面权限写在 `staticData.permission`；按钮权限全部写入 `staticData.actions`。
- 普通菜单同步登记到子系统 `manifest.ts`；Shell 内核入口按架构约定不重复放入侧栏。
- 角色 Mock 权限资源、manifest、路由 action code 必须逐字一致。

## 5. Mock 可用闭环

每个业务包的 Mock 与业务共置，并在 `frontend/src/mocks/handlers.ts` 聚合。Mock 不是静态假数据，至少满足：

1. 列表或详情可读取。
2. 原型中的新增、编辑、删除、状态切换、审批或导出动作能执行。
3. 变更后重新查询能回读结果。
4. 非法入参、资源不存在和重复操作返回明确业务错误。
5. 测试结束通过统一 `resetDb()` 恢复种子，保证可重复运行。

## 6. UI 与国际化

- 先复用 `components/pro` 的 PageScaffold、DataTable、SideList、FilterSelect、SearchField、FormDialog、ConfirmDialog 等组合件，再使用 `components/ui` 原语。
- 业务层只写布局，交互状态样式由 UI/Pro token 提供；不得新增硬编码颜色和任意圆角。
- 用户可见文案全部进入对应 locale namespace，中英文 key 结构保持一致。
- 涉及基础 UI/Pro 状态时，同步 `/dev/theme-states` 和主题守卫。
- 90% / 100% / 108% 显示比例下检查溢出、Portal 定位和关键操作可达性。

## 7. TDD 顺序

1. 先写架构守卫或行为测试，并确认因目标缺失而失败。
2. 实现最小完整业务闭环，使测试转绿。
3. 补错误分支、权限分支、Mock 回读和原型差距测试。
4. 运行该业务包的类型、Lint 和测试。
5. 里程碑执行 Admin 全量门禁、生产构建和浏览器视觉验收。

## 8. 完成定义

- 目录、依赖方向、Route 边界和 Query Key 守卫通过。
- 原型关键功能在 Mock 环境可重复操作且可回读。
- 只读权限不暴露写操作，按钮权限声明完整。
- 中文和英文资源结构一致，多主题与三档比例可用。
- `tsc`、ESLint、Vitest、主题守卫、设计守卫、生产构建和视觉验收全部通过。
