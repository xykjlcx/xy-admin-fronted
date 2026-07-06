# Changelog

## Unreleased

### 新增
- M1：角色与权限页（`/admin/roles`）、菜单管理页（`/admin/menus`），含子系统/菜单 CRUD 与视觉验收。

### 变更
- 主题体系深化（Steps 3-9）：组件族状态 token（`--field-*`/`--button-*`/`--overlay-*`/`--table-*`/`--nav-item-*` 等）、`/dev/theme-states` 状态矩阵、`theme:guard` 与 `design:lint` 门禁。
- `users` 改造为纵切包（`src/modules/admin/users/`），确立唯一纵切范本；数据下沉、query key factory、运行时契约层落地。
- 通用表格迁移到 TanStack Table（`components/pro/DataTable`），受控行选择、根治 checkbox 错位。
- 脚手架规范文档收敛：`docs/architecture.md`（架构真相源）+ `AGENTS.md`（铁律速查）。

> roles/menus/dashboard 仍为待迁移的横切遗留结构，唯一纵切范本是 `modules/admin/users/`。

## 0.1.0 (M0) - 2026-07-03

- 搭建 Vite + React + TypeScript + Tailwind CSS v4 + shadcn/ui 工程底座。
- 落地原型 token 体系、`--app-scale` 显示比例、三布局 Shell、外观抽屉与切页动效。
- 接入 TanStack Router / Query、MSW mock、鉴权守卫、权限过滤、403/404。
- 完成后台管理 `admin` 子系统基础菜单与“成员与部门”垂直切片。
- 基于成员页复盘沉淀 `TableShell`、`StatusBadge`、`ConfirmDialog`，暂不抽象完整 DataTable。
- 补齐 Agent Browser 视觉验收脚手架、CI、模板协作规则与 mock 剥离验收。
