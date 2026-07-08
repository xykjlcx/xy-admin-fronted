---
version: alpha
name: Feishu-Admin
description: 飞书管理后台设计体系（实测蒸馏版）。白色画布 + 浅灰工作面，功能主义蓝为唯一交互色。输入控件是灰底无边框感，聚焦时反转为白底细蓝边、无 ring 晕染。小圆角（4/6px）、紧凑密度（按钮 32px、字重 400）、几乎无阴影。整体气质：高效、克制、信息密度优先。
colors:
  primary: "#3370ff"
  primary-soft: "#eef3ff"
  primary-hover: "#5285ff"
  primary-pressed: "#2456cc"
  canvas: "#ffffff"
  sidebar: "#f2f3f5"
  surface-muted: "#f2f3f5"
  ink: "#1f2329"
  body: "#4e5969"
  muted: "#8f959e"
  hairline: "#e5e6eb"
  border-card: "#dee0e3"
  border-component: "#d0d3d6"
  divider: "rgba(31, 35, 41, 0.15)"
  fill-hover: "rgba(31, 35, 41, 0.08)"
  fill-pressed: "rgba(31, 35, 41, 0.12)"
  fill-selected: "rgba(51, 112, 255, 0.1)"
  field-bg: "#f2f3f5"
  on-primary: "#ffffff"
  success: "#16a34a"
  warning: "#ff8000"
  error: "#f53f3f"
typography:
  body-md:
    fontFamily: "PingFang SC, Helvetica Neue, Microsoft YaHei, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.55
  title-md:
    fontFamily: "PingFang SC, Helvetica Neue, Microsoft YaHei, sans-serif"
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.4
  caption:
    fontFamily: "PingFang SC, Helvetica Neue, Microsoft YaHei, sans-serif"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
  button:
    fontFamily: "PingFang SC, Helvetica Neue, Microsoft YaHei, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1
rounded:
  xs: 4px
  sm: 6px
  md: 6px
  lg: 8px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
components:
  text-input:
    backgroundColor: "{colors.field-bg}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    height: 36px
    padding: 0 12px
  text-input-focused:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
  text-input-disabled:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.muted}"
    rounded: "{rounded.md}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    height: 32px
    padding: 0 16px
  button-primary-active:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
  button-secondary:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    height: 32px
    padding: 0 16px
  select-option-highlighted:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary}"
    rounded: "{rounded.sm}"
  nav-item-current:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
  table-header:
    backgroundColor: transparent
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    height: 48px
    padding: 0 12px
  sidebar:
    backgroundColor: "{colors.sidebar}"
    textColor: "{colors.body}"
  badge:
    rounded: 5px
    padding: 2px 8px
---

## Overview

飞书管理后台是功能主义的中式企业工具美学：**白色画布 + `#F2F3F5` 浅灰工作面**，
唯一交互色是功能蓝 `{colors.primary}`（#3370FF），不做任何品牌化渲染。信息密度优先于呼吸感：
按钮 32px 高、字重 400、行高紧凑、圆角小（4/6px）。整体几乎不用阴影，层次靠"白 vs 浅灰"两级表面表达。

数据来源：2026-07-04 admin.feishu.cn 真实登录态 computed style 实测 + 飞书主应用 UD token 体系全量
dump（13273 个变量，`docs/design/research/feishu-ud-tokens.json`；组件实测见同目录
`feishu-admin-measurements.md`）。dark mode 值不在本文件（飞书后台无深色模式），
本项目的 feishu 暗色映射见 `src/styles/tokens.css` 的 `[data-flavor='feishu'][data-mode='dark']` block。

v4 修正（第七轮，UD 官方体系）：**hover 方向变浅**（UD primary 四态 default→hover 是升阶变浅，
pressed 才变深；primary-hover = 主蓝混 15% 白）；**交互底 alpha 化**（hover = N900@8%、pressed = N900@12%、
selected = 主蓝@10%，即 UD fill-* 官方值）；**边框两级**（card `#DEE0E3`=N300 / component `#D0D3D6`=N350）+
divider N900@15%。主蓝保留 admin 实测 `#3370FF`（主应用当代蓝 `#1456F0` 记录在案不采用，用户拍板）。

**Key Characteristics:**

- 输入控件是**灰底无边框感**（`{colors.field-bg}`，边框与底色同色），不是"白底描边"——这是飞书区别于
  Ant/shadcn 系的核心特征。
- 聚焦态是**表面反转**：灰底变白底 + 1px 细蓝边（`{colors.primary}`），**没有 ring 晕染**。
- 主按钮比输入框矮一档（32px vs 36px）、字重 400——控件轻，不抢内容。
- 侧栏 `{colors.sidebar}` 浅灰、表头透明底——大面积表面保持安静。

## Colors

- **Primary (`{colors.primary}` — #3370FF)**：唯一交互色。主按钮、focus 边框、链接、导航当前项文字。
- **Primary Soft (`{colors.primary-soft}` — #EEF3FF)**：选中态浅底（导航当前项、下拉高亮项、选中行）。
- **Canvas (`{colors.canvas}` — #FFFFFF)**：页面主底。飞书后台是白底工具，不是灰底工具。
- **Sidebar / Surface Muted (`{colors.sidebar}` — #F2F3F5)**：侧栏、输入框底、禁用底、次级表面，一色多用。
- **Ink (`{colors.ink}` — #1F2329)**：主文字。飞书 UD 的标志性暖黑。
- **Body (`{colors.body}` — #4E5969)** / **Muted (`{colors.muted}` — #8F959E)**：次级文字 / 占位与说明。
- **Hairline (`{colors.hairline}` — #E5E6EB)**：分割线。注意：输入框**不用**它描边（输入框边框同底色）。
- 语义色 success/warning/error 为本项目既有值，与飞书 UD 同风格域。

## Typography

全部无衬线（PingFang SC 栈），14px 基准。**字重克制是密度感的来源**：正文与按钮 400，
仅标题与强调 500，不出现 600+。行高紧凑（1.4-1.55）。

## Layout

4px 基础网格；控件间距 8/12px，区块间距 16/24px。密度倾向紧凑：
表格实测（2026-07-08 admin.feishu.cn 真机 computed style）：表头行 48px、数据行 44px、单元格水平内距 12px、字号 14px、行分隔 1px hairline。旧「≈40px / 真身 28-32」估值作废，以实测为准。

## Elevation & Depth

几乎无阴影。层次 = 白画布 vs `#F2F3F5` 灰面两级表面 + hairline 分割线。
弹层（下拉/弹窗）使用本项目既有 shadow token（`--shadow-popover` 等），不额外发明。

## Shapes

小圆角体系：控件 6px（`{rounded.md}`）、小元素 4px、卡片 8px（`{rounded.lg}`）。
对应本项目 `--radius-factor: 0.75` 档。

## Components

- **`text-input`**：灰底 `{colors.field-bg}`、边框同底色（无边框感）、36px 高。
  聚焦 `text-input-focused`：**底色反转为白** + 1px `{colors.primary}` 边，无 ring。
  失效 `text-input-disabled`：灰底 + `{colors.muted}` 文字。
- **`button-primary`**：`{colors.primary}` 蓝底白字、32px 高、字重 400、6px 圆角。
  按下用 `{colors.primary-hover}` 系派生（本项目由 color-mix 派生，hover 值不单独维护）。
- **`button-secondary`**：白底 + hairline 描边、同尺寸。（hover 行为待补采，见 spec 值表【待补采】）
- **`select-option-highlighted`**：`{colors.primary-soft}` 浅蓝底 + `{colors.primary}` 蓝字。
- **`nav-item-current`**：同 option 选中语义（浅蓝底 + 蓝字）。
- **`table-header`**：**透明底**（不是灰底表头）、`{colors.ink}` 文字、字重 400。
- **`badge`**：5px 圆角（走 `--radius-5`）、内距 2px/8px、12px 字号、medium 500 字重；7 语义色（neutral/primary/success/warning/danger/purple/teal）各走软底 + 前景，几何/排印三 flavor 统一（挂点 `--badge-*`）。原型无 badge，值 = 脚手架现状；官方 registry 对照见 `research/registry-badge-card-values.md`。

## Do's and Don'ts

### Do

- 输入控件用灰底无边框感，聚焦时反转白底蓝边——这是飞书感的核心开关。
- 控件保持小巧：按钮 32px / 字重 400 / 6px 圆角。
- 选中/当前态统一用 primary-soft 浅蓝底 + primary 蓝字。
- 大面积表面（侧栏、表头）保持安静：浅灰或透明，不加阴影。

### Don't

- 不要给输入框加 ring 晕染——飞书聚焦态没有 ring。
- 不要用灰底表头（真身是透明底）。
- 不要加大字重来强调（飞书用颜色和布局强调，不用 600+ 字重）。
- 不要把 primary 蓝用于大面积装饰——它只出现在交互点上。
