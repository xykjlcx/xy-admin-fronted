---
version: alpha
name: Shadcn-Admin
description: shadcn/ui 官方（new-york / zinc）设计体系的后台适配版。纯白画布 + zinc 中性灰阶，主色即墨黑。输入框透明底 + 浅灰边，聚焦是中灰边 + 3px 半透明晕染 ring（不是主色边框）。10px 圆角、36px 控件（radix 线 h-9）、无阴影文化。整体气质：工程师的克制精确，零装饰。
colors:
  primary: "#18181b"
  primary-fg: "#fafafa"
  canvas: "#ffffff"
  surface-muted: "#f4f4f5"
  ink: "#09090b"
  body: "#3f3f46"
  muted: "#71717a"
  hairline: "#e4e4e7"
  ring: "#9f9fa8"
  on-primary: "#fafafa"
  success: "#16a34a"
  warning: "#f59e0b"
  error: "#ef4444"
typography:
  title-md:
    fontFamily: "Geist, Inter, PingFang SC, sans-serif"
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: -0.2px
  body-md:
    fontFamily: "Geist, Inter, PingFang SC, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  caption:
    fontFamily: "Geist, Inter, PingFang SC, sans-serif"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.4
  button:
    fontFamily: "Geist, Inter, PingFang SC, sans-serif"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1
rounded:
  sm: 6px
  md: 10px
  lg: 14px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
components:
  text-input:
    backgroundColor: transparent
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    height: 36px
    padding: 0 12px
  text-input-focused:
    backgroundColor: transparent
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    height: 36px
    padding: 0 16px
  button-secondary:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    height: 36px
    padding: 0 16px
  button-outline:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    height: 36px
    padding: 0 16px
  select-option-highlighted:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
  nav-item-current:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
  table-header:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.muted}"
    typography: "{typography.caption}"
---

## Overview

shadcn/ui 官方风格（new-york 线 / zinc 基色）是工程模板的中性基线：**纯白画布 + zinc 灰阶，
主色即墨黑 `{colors.primary}`（#18181B）**，不存在品牌彩色。一切交互反馈走中性系：
高亮是浅灰、选中是浅灰 + 图标、focus 是灰色晕染。零装饰、零阴影、依赖精确的灰阶层次。

数据来源：2026-07-04 ui.shadcn.com 组件文档页 computed style 实测（input/button，base 与 radix
两条组件线均采），详见 spec §16.5。dark mode：官方 zinc dark（画布 #09090B、表面 #18181B、primary 反转 #FAFAFA 配墨字，
**边框 = 白@10%、input = 白@15% 的 alpha 体系**，非实色）——v4 起 dark 边框按官方 alpha 落。
源码合同与 registry 原始值存档见 `docs/design/research/shadcn-*`。

**Key Characteristics:**

- **输入框透明底**（透出画布），1px `{colors.hairline}` 浅灰边——不是白底也不是灰底。
- **聚焦不变主色**：边框转中灰 + **3px 半透明晕染 ring**（`{colors.ring}` 50% 透明向外扩散）。
  这是 shadcn 感的核心开关：focus 是"晕开"，不是"描色"。
- 控件 36px 高（new-york-v4/radix 线源码 h-9；官网 demo 的 32px 为 Base UI 线，勿混用）、10px 圆角、无阴影。
- 高亮/选中全部中性灰系（`{colors.surface-muted}`），选中依赖 check 图标而非颜色区分。

## Colors

- **Primary (`{colors.primary}` — #18181B)**：即 zinc-900 墨黑，主按钮底、强调文字。
  dark mode 反转为 #FAFAFA（对应本项目 accent shadcn 的 `priDark`）。
- **Canvas (`{colors.canvas}` — #FFFFFF)** / **Ink (`{colors.ink}` — #09090B)**：纯白纸 + 近纯黑墨。
- **Surface Muted (`{colors.surface-muted}` — #F4F4F5)**：zinc-100。secondary 按钮底、
  option 高亮底、选中底、代码块底，一色多用。
- **Hairline (`{colors.hairline}` — #E4E4E7)**：zinc-200 控件描边与分割线。
- **Ring (`{colors.ring}` — #9F9FA8)**：focus 晕染基色（实际以 50% 透明使用，≈zinc-400/50）。
- **Muted (`{colors.muted}` — #71717A)**：zinc-500 次级文字、表头文字。
- 语义色走 tailwind 默认档（green-600 / amber-500 / red-500），同样克制使用。

## Typography

全部无衬线（Geist 栈，回退 Inter/PingFang SC），14px 基准。与飞书相反，shadcn **靠字重分层**：
标题 600 + 负字距、按钮/标签 500、正文 400。

## Layout

4px 网格，控件高 36px（input/button 官方源码 h-9）、input 内边距 12px（px-3）/ button 16px（px-4）。

## Elevation & Depth

**无阴影文化**：官方组件 shadow 为 none 或 shadow-xs 级。层次靠 hairline 边和 zinc 灰阶。
弹层用最小阴影档，不做大扩散柔影。

## Shapes

控件 `{rounded.md}` 10px（官方 rounded-lg 实测值）、小元素 6px、卡片 14px。
对应本项目 `--radius-factor: 1.25` 档。

## Components

- **`text-input`**：**透明底** + 1px `{colors.hairline}` 边、10px 圆角、36px 高（h-9）。dark 底为 `--input`(白@15%) 的 30% 叠加（源码 `dark:bg-input/30`），invalid ring = `destructive/20`（dark `/40`）。
  聚焦 `text-input-focused`：边框转中灰（≈zinc-500，不是黑）+ **3px `{colors.ring}` 50% 透明晕染 ring**。
- **`button-primary`**：墨黑底 `{colors.primary}` + `{colors.on-primary}` 字、36px 高、10px 圆角、无阴影；hover = `bg-primary/90`（90% 透明混合）。
- **`button-secondary`**：`{colors.surface-muted}` zinc-100 底、无边框。
- **`button-outline`**：白底 + hairline 边；hover 底转 `{colors.surface-muted}`（边框**不变**主色）。
- **`select-option-highlighted` / `nav-item-current`**：`{colors.surface-muted}` 中性灰底 +
  `{colors.ink}` 字；选中项靠 check 图标标识，不靠颜色。
- **`table-header`**：白底（或 muted 底）+ `{colors.muted}` 小号文字。

## Do's and Don'ts

### Do

- focus 一律用半透明晕染 ring，边框只到中灰为止。
- 高亮/选中用中性灰 + 图标语义，保持全界面无彩色。
- 控件保持 36px 高度（h-9）和 10px 圆角。
- 用字重（600/500/400）做层次，别用颜色。

### Don't

- 不要让 focus 边框变成主色黑——官方是中灰 + 晕染。
- 不要给输入框铺白底或灰底——透明底透出画布才是官方做法。
- 不要引入品牌彩色做高亮——中性系是 shadcn 的身份。
- 不要加阴影装饰卡片和按钮。
