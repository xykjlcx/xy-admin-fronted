# 通用后台管理脚手架前端规则

## 项目定位

- Vite + React + TypeScript + Tailwind CSS v4 + shadcn/ui 的后台管理模板。
- 高保真视觉基准是 `后台管理脚手架.dc.html`；当 README 与实现方案冲突，以 `docs/superpowers/specs/2026-07-02-admin-scaffold-frontend-design.md` 和当前代码为准。

## 显示比例纪律

- 显示比例统一使用 `--app-scale` token 乘法，不使用 CSS `zoom`。
- 业务页面优先使用 Tailwind 默认 spacing/text/radius 与 `components/pro` 公共组件，基础层会统一吃到 `--app-scale`。
- 确需写精确任意 px 时，必须写成 `calc(Npx * var(--app-scale))`，或沉到公共组件 / token 层。
- 新增图表、虚拟表格、富文本、代码编辑器、地图、Canvas、第三方弹层等重组件时，必须验证 90% / 100% / 108% 三档：尺寸是否随比例变化、portal 浮层是否定位正确、整页是否出现溢出。
- Tailwind source 限定只扫描 `src`；不要让 `docs` / README / AGENTS 里的示例 class 进入生产 CSS。

## 基础铁律

- 组件代码禁止硬编码十六进制色值，优先使用语义 token。
- 禁止 `rounded-[Npx]` 任意圆角；圆角走 `--radius-*` token。
- 服务端数据归 TanStack Query；zustand 只存纯客户端状态，如 token、外观设置、折叠状态。
- query key 使用 `[domain, resource, params]`；变更后按前缀失效。
- 路由 `staticData` 使用 `labelKey/groupKey/action.labelKey`，不要把用户可见中文散落在路由元数据里。
- 前端权限只负责体验与防误触，不是安全边界；生产权限必须由后端校验。
- 文案走 i18n key；M0 允许 `en-US` 先保底，不允许新增中文硬编码进组件。
- mock 只在开发态、demo 模式或 `VITE_ENABLE_MOCK=true` 时启用；生产构建必须剥离 faker/msw/mock worker。
- 环境文件 `.env*` 不提交；开发默认 mock 已由代码启用，需要覆盖时只写本地 `.env.development`。
- 每次声称完成前，至少跑 `./node_modules/.bin/tsc -b --noEmit`、`./node_modules/.bin/vitest run`、`./node_modules/.bin/eslint src`。

## 子系统清单

新增子系统：建 `modules/<key>/manifest.ts`、`api/`、`mocks/`；建 `routes/_auth/<key>/` 页面并写 staticData；在 `modules/registry.ts` 注册；挂 mock handlers；补 locales；新图标进 icon registry；真后端再补 seed/menu/permission。

删除子系统：删 `modules/<key>/`、删 `routes/_auth/<key>/`、registry 除名、删 locales namespace。

`admin` 是内核子系统；登录、消息中心、个人中心是 Shell 入口依赖，不当普通业务页随意删除。
