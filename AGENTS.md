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
- 每次声称完成前，至少跑 `./node_modules/.bin/tsc -b --noEmit`、`./node_modules/.bin/vitest run`、`./node_modules/.bin/eslint src`。
