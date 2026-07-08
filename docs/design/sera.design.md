---
version: alpha
name: Sera-Admin
description: shadcn 官方 base-sera 风格的后台适配版。复用 zinc 中性黑白色阶（与 shadcn 逐字节同色，D1），差异化全交几何与排印——直角（radius-factor 0）、按钮大写 + 加宽字距 + 40px 高、输入框只剩底边线、表头大写、卡片 32 内距、badge 裸文字。整体气质：印刷体标签语言的 editorial 克制。
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
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 0.05em
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
    letterSpacing: 0.05em
  button:
    fontFamily: "Geist, Inter, PingFang SC, sans-serif"
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1
    letterSpacing: 0.1em
rounded:
  sm: 0px
  md: 0px
  lg: 0px
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
    height: 40px
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
    height: 40px
    padding: 0 24px
  button-secondary:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    height: 40px
    padding: 0 24px
  button-outline:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    height: 40px
    padding: 0 24px
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
    height: 48px
    padding: 0 12px
  badge:
    rounded: 0px
    padding: 0px 0px
  card:
    rounded: 0px
    padding: 32px
---

## Overview

sera 是 shadcn 官方 registry 的 `base-sera` 风格（对照 `base-nova`）的后台适配版。**颜色与
shadcn 逐字节相同**（zinc 黑白硬朗基线，`{colors.primary}` #18181B 即墨黑主色，纯白画布），
sera 官方本身不携带独立色系——它的身份**全部落在几何与排印**：直角、大写标签、下划线输入。

数据来源：2026-07-08 ui.shadcn.com `base-sera` 十二组件 registry 源码逐字节实抓，
详见 `docs/design/research/registry-sera-full-values.md`（24/24 实抓，10 条横切规律）。
本项目落地决策见 `.superpowers/sdd/s5-design-note.md`（D1–D7 七决策）。

**Key Characteristics:**

- **直角贯彻**：`{rounded.md}` = 0px。按钮 / 输入 / 卡片 / 表头 / 弹层全部 `rounded-none`
  （唯一例外是 radio，见「有意偏离」）。对应本项目 `--radius-factor: 0`（数学上抹平用户圆角档，D6）。
- **大写标签语言**：按钮 / Label / 表头 / 标题 / 弹层项统一 `uppercase` + 加宽字距
  （button `0.1em`、label `0.025em`、表头 / 标题 `0.05em`）。走 `--*-transform` / `--*-tracking` token 束。
- **底边线输入**：输入框透明底 + 仅底边着色（`{colors.hairline}`），其余三边透明；聚焦 / 校验错误
  **只变底边颜色、不起 ring**（对比 shadcn 的全框 + 晕染 ring）。
- **疏朗尺寸**：按钮 40px 高（h-10）、卡片 32px 内距 + `shadow-sm`、表头 48px、badge 裸文字（无内距 / 无底色）。
- **ring 收窄**：按钮 / 复选 / 开关的 focus ring 从 3px 收到 2px（`--focus-ring`）。

## Colors

与 `shadcn.design.md` 完全一致（D1 复用，不新造色系）：`{colors.primary}` #18181B 墨黑、
`{colors.canvas}` 纯白、`{colors.ink}` 近黑墨字、`{colors.surface-muted}` zinc-100、
`{colors.hairline}` zinc-200 描边、`{colors.muted}` zinc-500 次级 / 表头文字。
dark mode 走官方 zinc dark（画布 #09090B、表面 #18181B、primary 反转 #FAFAFA、边框 = 白@10% alpha）。
accent 默认 = shadcn 中性黑；差异化不靠颜色，靠几何 / 排印。

## Typography

无衬线（Geist 栈，回退 Inter/PingFang SC），14px 基准。sera 靠**字重 + 大写 + 字距**分层：
标题 / 按钮 600 semibold、正文 400；按钮 / Label / 表头 / 标题一律 `uppercase` 并加宽字距，
形成"印刷体标签"表头范式。

## Layout

4px 网格。按钮 40px 高（h-10）、px-6；输入 40px 高、水平内距 12px（`--field-px`，见有意偏离）；
表头 48px（h-12）；卡片 32px 内距（spacing-8）。

## Elevation & Depth

近乎无阴影：卡片走 `shadow-sm`（`--shadow-card-sm`），弹层走最小档。层次靠 hairline 边、
直角块面与 zinc 灰阶，不做大扩散柔影。

## Shapes

**全直角**：`{rounded.md}` 0px（`rounded-none`），对应本项目 `--radius-factor: 0` 档。
唯一例外是 radio（保留圆形，见下）。

## Components

- **`text-input`**：**透明底** + 仅底边 `{colors.hairline}` 线、40px 高、直角（无圆角）。
  聚焦 `text-input-focused` 只把底边变主色（`--field-border-focus` = primary），**无 ring**；
  校验错误只把底边变红（`aria-invalid` → `border-b-destructive`），**红 ring 关闭**（`--field-ring-invalid: transparent`）。
  **disabled/readonly 同为透明底**（`--field-bg-disabled/--field-bg-readonly: transparent`）——base 默认灰块在无底输入族里会呈"假四边框"（2026-07-08 菜单弹窗实测）；不可用态区分靠文字降级 + cursor。
- **`button-primary`**：墨黑底 + `{colors.on-primary}` 字、40px 高、直角、`uppercase` + `0.1em` 字距、无阴影。
- **`button-secondary` / `button-outline`**：surface-muted / canvas 底、`{colors.ink}` 字，其余同 primary 几何。
- **`table-header`**：canvas 底 + `{colors.muted}` 小号文字、48px 高、`uppercase` + `0.05em` 字距。
- **`badge`**：裸文字——无内距、无底色、直角（`--badge-px/py: 0`、10px 字号、semibold）。
- **`card`**：直角 + 32px 内距 + `shadow-sm`（`--card-spacing: 32`、`--card-shadow: --shadow-card-sm`）。

## 有意偏离（Intentional Deviations）

以下几处**刻意不追随官方 base-sera**，理由记录在案（决策见 s5-design-note.md §1）：

- **radio 不做空心描边（D5）**：官方 sera 的 radio 选中态是"空心描边 + 前景色圆点"（checkbox/switch 均实心，
  radio 是官方最反常点）。本项目 radio/checkbox 共用 `--choice-*` token，为单一反常点拆 radio 专属 token 束不值——
  sera 的 radio 与 checkbox 一致**实心填充**。
- **switch 保持圆角胶囊（D7）**：官方 sera 的 switch 轨道 / 滑块方角化。本项目 switch 圆角是硬编码 `rounded-full`，
  `--radius-factor: 0` 碰不到；要方角必须动组件类 = 扩大型分支面。第一版保持**圆角胶囊**；真要做先把 switch 圆角 token 化再填表。
- **圆角档在 sera 下无感（D6）**：`--radius-factor: 0` 数学上抹平用户的 sharp/default/round 圆角档（乘 0 恒为 0）。
  这是已知特性，抽屉圆角档不置灰（避免为单 flavor 加 UI 特判）。
- **输入水平内距保留 12px（非官方 px-0）**：官方 sera input 是 `px-0`（零水平内距）。本项目 `--field-px` 同时是
  `--table-cell-px` 的单一真相源，归零会压垮表格单元格内距——故 sera input 保留 12px 内距，只在"底边线 + 透明底"上贴齐官方。
- **与 shadcn 同色（D1）**：sera 与 shadcn 风格卡的取色器色点相同（都是 zinc 黑白），是已知 UX 限制（不造假色区分）；
  风格卡 desc 文案用"直角 · 大写 · 下划线"帮助用户区分。

## Do's and Don'ts

### Do

- 输入框只用底边线表达聚焦 / 错误，绝不加 ring。
- 按钮 / 标签 / 表头一律 `uppercase` + 加宽字距，保持印刷体标签语言。
- 控件保持直角（`rounded-none`）、40px 高、疏朗内距。
- badge 用裸文字，card 用 `shadow-sm` + 32 内距。

### Don't

- 不要给输入框加 ring 或圆角——sera 是底边线 + 直角。
- 不要给 badge 加底色 / 内距——sera badge 是裸文字标签。
- 不要新造彩色——sera 复用 shadcn zinc 黑白，差异化靠几何 / 排印。
- 不要把 radio 改成空心、把 switch 改成方角（第一版有意偏离，见上）。
