# 官方 shadcn 源码同步治理规则

> 权威来源：`docs/superpowers/specs/2026-07-07-shadcn-create-inspired-design-system-prd.md` §7.2。
> 本仓库是 shadcn source-code 模式（`components.json` 存在）。官方源码是**上游参考**，不是覆盖源。

## 铁律

1. **禁止对已定制组件 `--overwrite`。** 会丢失本地 `--app-scale`、组件族 token、变体扩展、`.ui-*` 状态机挂载。
2. **官方源码进来只经 diff 人工合并**，标准流程：
   - `pnpm dlx shadcn@latest add <component> --dry-run` 看影响面
   - `pnpm dlx shadcn@latest add <component> --diff <file>` 看逐文件差异
   - 有本地改动的文件：读本地 + 读 diff，人工把上游变化并入，保留本地 token/scale/variant
   - 只有新增文件，或经定制清单 + 人工 diff 确认未被本仓库 fork/定制的文件，才可从官方输出写入
   - 既有 `src/components/ui/*` 默认按本地 fork 处理，除非已证明不是本仓库定制文件
3. **源码判断基准钉住 style 无关的 canonical URL**：`https://ui.shadcn.com/code/apps/v4/registry/bases/radix/ui/<component-file>`（语义类版本）。
   - 示例：`curl -L https://ui.shadcn.com/code/apps/v4/registry/bases/radix/ui/button.tsx`
   - 将 `button.tsx` 替换为目标 `<component-file>`
   - 若使用 `/r/styles/{style}` 展平端点，必须记录固定 style，避免把 style 间差异当成官方改动。
4. **`components.json` 的 `style` 字段当前是旧世代值 `new-york`**。CLI `--diff` 会受该 style 影响，只用于影响面 / 写入预览；源码判断以上述 canonical URL 为准。

## 官方新增组件分类

- **直接可用**：未定制、无主题风险（如纯展示组件）→ 可 `add`。
- **需 token 化**：Button/Input/Select/Dialog/Table 等基础控件 → 必须并入 `--*` token 与 `.ui-*` 状态机后才算完成。
- **不接入**：与当前 Pro 层边界冲突或过度复杂的 → 记录理由，不引入。

## 何时用本规则

任何「从官方拉组件源码 / 升级已有组件 / 应用 preset」的动作前，先读本文件。

## 合并后验证

- 普通门禁：`./node_modules/.bin/tsc -b --noEmit`、`./node_modules/.bin/eslint src`、`./node_modules/.bin/vitest run`
- 涉及 UI / token / Pro / 主题状态：追加 `pnpm theme:guard`
