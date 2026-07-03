# 通用后台管理脚手架协作规则

## 项目定位

- 本仓库是 Vite + React + TypeScript + Tailwind CSS v4 + shadcn/ui 的企业后台模板。
- 视觉权威源是 `后台管理脚手架.dc.html`；设计决策以 `docs/superpowers/specs/2026-07-02-admin-scaffold-frontend-design.md` 为准。
- M0 只交付后台管理骨架与“成员与部门”垂直切片；HR、CRM、Project 等未来子系统不要提前种入。

## 代码边界

- 服务端数据全部走 TanStack Query：用户资料、权限、菜单、子系统、业务列表都属于服务端状态。
- zustand 只存纯客户端状态：auth token、外观设置、折叠状态。
- 页面只消费 queryOptions/API 模块，不直接拼 HTTP 细节。
- query key 使用 `[domain, resource, params]`，变更后按前缀失效。

## 视觉与 token

- 组件代码禁止硬编码十六进制色值，使用 `bg/surface/text/pri/border` 等语义 token。
- 禁止 `rounded-[Npx]` 和任意阴影值；圆角、阴影走 token。
- 显示比例只能用 `--app-scale` 乘法，不使用 CSS `zoom`。
- 业务页面优先使用 Tailwind 默认 spacing/text/radius 与 `components/pro`；必须写精确 px 时写成 `calc(Npx * var(--app-scale))`。
- 新增图表、虚拟表格、富文本、代码编辑器、地图、Canvas、第三方弹层时，必须验证 90% / 100% / 108% 三档。

## 子系统操作清单

新增子系统：

1. 新建 `src/modules/<key>/manifest.ts`、`api/`、`mocks/`。
2. 新建 `src/routes/_auth/<key>/` 页面，并在路由 `staticData` 写权限元数据。
3. 在 `src/modules/registry.ts` 注册 manifest。
4. 在 mock handler 聚合处挂上新模块 handlers。
5. 新建 `src/locales/zh-CN/<key>.json` 与 `src/locales/en-US/<key>.json`。
6. 新图标进入 `src/lib/icon-registry.tsx`。
7. 对接真后端时补对应 seed / 菜单 / 权限数据。

删除子系统：

1. 删除 `src/modules/<key>/`。
2. 删除 `src/routes/_auth/<key>/`。
3. 从 `src/modules/registry.ts` 移除注册。
4. 删除对应 locales namespace。

`admin` 是内核子系统；登录、消息中心、个人中心是 Shell 入口依赖，不可当普通业务页随意删除。

## 权限与 i18n

- 前端权限只负责体验与防误触，不是安全边界；生产权限必须由后端校验。
- 模板模式下，路由 `staticData` 聚合权限目录，后端保存分配关系。
- 对接模式下，后端 permission/menu 表为准，前端 `staticData` 做声明校验。
- 文案走 i18n key；M0 允许 `en-US` 文件存在但不完整翻译，不能把新增中文硬编码进组件。

## Mock 与交付验证

- mock 在开发态、demo 模式或 `VITE_ENABLE_MOCK=true` 时 dynamic import；生产构建必须剥离 faker/msw/mock worker。
- 本地完成前至少运行：
  - `./node_modules/.bin/tsc -b --noEmit`
  - `./node_modules/.bin/vitest run`
  - `./node_modules/.bin/eslint src`
- M0 视觉验收使用 Agent Browser：`pnpm visual:baseline` 采集原型基线，`pnpm visual` 采集实现截图、生成 diff 与比例三档报告。
