# M1 角色与权限 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付 `/admin/roles` 角色与权限页面，完成原型级视觉结构、mock API 读写闭环、权限入口、测试与 Agent Browser 视觉验收。

**Architecture:** 路由层负责权限声明、Query/Mutation glue 和失效；`role.api.ts` 负责 DTO/queryOptions/API；`role.handlers.ts` 负责 MSW 内存数据；`RolesView.tsx` 保持页面高内聚，不提前抽 DataTable；视觉验收脚本新增 roles 场景并纳入现有 M0 报告。

**Tech Stack:** Vite, React 19, TypeScript, TanStack Router/Query, MSW, Vitest + Testing Library, Tailwind CSS v4 + shadcn/ui + lucide-react, Agent Browser CLI。

---

## File Map

- Create `src/modules/admin/api/role.api.ts`：角色、权限树、成员、日志、管理员角色 DTO 与 API/queryOptions。
- Create `src/modules/admin/api/__tests__/role.api.test.ts`：query key 与 placeholder/接口形状测试。
- Create `src/modules/admin/mocks/role.handlers.ts`：MSW handlers 与种子数据。
- Create `src/modules/admin/mocks/__tests__/role.handlers.test.ts`：mock API 行为测试。
- Create `src/modules/admin/components/roles/RolesView.tsx`：完整角色与权限页面。
- Create `src/modules/admin/components/roles/__tests__/RolesView.test.tsx`：页面交互测试。
- Create `src/routes/_auth/admin/roles.tsx`：路由接入。
- Modify `src/modules/admin/manifest.ts`：新增角色与权限菜单。
- Modify `src/mocks/handlers.ts`：聚合 role handlers。
- Modify `src/locales/zh-CN/admin.json` and `src/locales/en-US/admin.json`：新增 roles 文案。
- Modify `src/lib/__tests__/menu-tree.test.ts`：补角色菜单权限过滤测试。
- Modify `scripts/visual-agent-browser.mjs`：新增 roles 原型/实现截图、断言和三档显示比例检查。
- Expected generated modify `src/routeTree.gen.ts`：由 TanStack Router 插件生成。

## Task 1: API Contract

- [ ] Write failing tests in `src/modules/admin/api/__tests__/role.api.test.ts`.
- [ ] Run `./node_modules/.bin/vitest run src/modules/admin/api/__tests__/role.api.test.ts` and confirm failure because `role.api.ts` is missing.
- [ ] Implement `src/modules/admin/api/role.api.ts` with DTOs, queryOptions and `roleApi`.
- [ ] Run the role API test and confirm pass.

Acceptance:

- `rolesQuery.queryKey` is `['iam', 'roles']`.
- `rolePermissionsQuery('hr').queryKey` is `['iam', 'rolePermissions', 'hr']`.
- `adminRolesQuery.queryKey` is `['iam', 'adminRoles']`.
- `roleApi.saveRolePermissions('hr', permissions)` sends `PUT /api/roles/hr/permissions`.

## Task 2: Mock Handlers

- [ ] Write failing tests in `src/modules/admin/mocks/__tests__/role.handlers.test.ts`.
- [ ] Run only that test and confirm failure because handlers are missing.
- [ ] Implement `src/modules/admin/mocks/role.handlers.ts`.
- [ ] Register handlers in `src/mocks/handlers.ts`.
- [ ] Run role handler tests and confirm pass.

Acceptance:

- `GET /api/roles` returns five prototype roles.
- `POST /api/roles` creates a custom role and it can be read back.
- `DELETE /api/roles/hr` returns business error; deleting a custom role succeeds.
- `PUT /api/roles/hr/permissions` persists and `GET /api/roles/hr/permissions` reads the saved value.
- `POST /api/admin-roles` creates a custom admin role and it can be read back.

## Task 3: Route, Manifest, Locale

- [ ] Write failing menu-tree test for `iam:role:view`.
- [ ] Run targeted test and confirm failure because menu seed has no roles entry.
- [ ] Add `/admin/roles` route with staticData and query/mutation glue.
- [ ] Add manifest menu seed `m-roles`.
- [ ] Add zh-CN/en-US roles locale keys.
- [ ] Run menu-tree test and typecheck enough to regenerate route tree.

Acceptance:

- Users with `iam:role:view` see `角色与权限`.
- Users without role permission do not see it.
- Route has page permission `iam:role:view`.
- Route actions include create/delete/grant/admin create permissions.

## Task 4: RolesView Behavior

- [ ] Write failing `RolesView` tests for viewer/admin role interactions.
- [ ] Run targeted test and confirm failure because component is missing.
- [ ] Implement `RolesView.tsx` with prototype layout and interactions.
- [ ] Run targeted tests and confirm pass.

Acceptance:

- Viewer sees role data but not create/delete/save buttons.
- Admin can open create-role modal, submit, and `onCreateRole` receives role input.
- Custom role shows delete action; system role does not.
- Permission action chip toggles local draft; resource/group/all/clear/reset controls call correct state updates.
- Save calls `onSaveRolePermissions` with current role id and permission map.
- Members/logs/admin tabs switch without full page navigation.

## Task 5: Integration Polish

- [ ] Run `./node_modules/.bin/vitest run src/modules/admin/components/roles/__tests__/RolesView.test.tsx src/modules/admin/mocks/__tests__/role.handlers.test.ts src/modules/admin/api/__tests__/role.api.test.ts src/lib/__tests__/menu-tree.test.ts`.
- [ ] Fix regressions without widening scope.
- [ ] Run `./node_modules/.bin/vitest run`.
- [ ] Run `./node_modules/.bin/tsc -b --noEmit`.
- [ ] Run `./node_modules/.bin/eslint src`.

Acceptance:

- Full test, typecheck and lint pass.
- No new `rounded-[Npx]` classes in `src`.
- No new component-level hex colors except existing token/test/style authority files.

## Task 6: Visual Validation

- [ ] Load Agent Browser core workflow with `agent-browser skills get core`.
- [ ] Add `roles` scenario to `scripts/visual-agent-browser.mjs`.
- [ ] Run `node scripts/visual-agent-browser.mjs baseline` and confirm `e2e/baseline/prototype-roles.png`.
- [ ] Run `node scripts/visual-agent-browser.mjs app` and confirm `test-results/m0-visual/app-roles.png` and `diff-roles.png`.
- [ ] Run `node scripts/visual-agent-browser.mjs scale` and confirm roles page has no overflow in 90/100/108 checks.
- [ ] Review screenshots manually against prototype and fix material layout gaps.

Acceptance:

- Visual report includes `roles`.
- Prototype screenshot, app screenshot and diff image exist.
- Page text assertions pass.
- Material differences are either fixed or explicitly documented in final review.

## Task 7: Multi-role Review and Commit

- [ ] 规格审：compare implemented scope against `docs/superpowers/specs/2026-07-03-m1-roles-permissions-design.md`.
- [ ] UI 审：compare screenshot against prototype roles page.
- [ ] 架构审：check route/API/mock/view boundaries.
- [ ] 工程规则审：run final verification commands.
- [ ] Commit docs and implementation with concise Chinese commit messages.

Acceptance:

- Final response reports verification results, visual artifacts, and any known residual gaps.
- Working tree contains no accidental unrelated changes.
