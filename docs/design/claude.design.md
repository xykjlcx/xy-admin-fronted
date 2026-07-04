---
version: alpha
name: Claude-Admin
description: Claude / Anthropic 设计体系的后台工具适配版。暖纸白画布 + 陶土珊瑚交互色 + 衬线展示标题。无硬边框文化：控件轮廓用 hairline 或极细描边阴影表达，浮起用大扩散低透明柔影。圆角比同类更大一档。整体气质：文质、温暖、编辑部感，是"看起来不像 SaaS 的 SaaS"。
colors:
  primary: "#cc785c"
  primary-active: "#a9583e"
  primary-disabled: "#e6dfd8"
  primary-soft: "#f8ede7"
  canvas: "#faf9f5"
  app-canvas: "#f8f8f6"
  surface: "#ffffff"
  surface-card: "#efe9de"
  surface-soft: "#f5f0e8"
  ink: "#141413"
  body: "#3d3d3a"
  muted: "#6c6a64"
  muted-soft: "#8e8b82"
  hairline: "#e6dfd8"
  hairline-soft: "#ebe6df"
  on-primary: "#ffffff"
  success: "#5db872"
  warning: "#d4a017"
  error: "#c64545"
typography:
  display-md:
    fontFamily: "Cormorant Garamond, Georgia, Songti SC, serif"
    fontSize: 28px
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: -0.3px
  title-md:
    fontFamily: "Inter, PingFang SC, sans-serif"
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.4
  body-md:
    fontFamily: "Inter, PingFang SC, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.55
  caption:
    fontFamily: "Inter, PingFang SC, sans-serif"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.4
  button:
    fontFamily: "Inter, PingFang SC, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1
rounded:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  pill: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
components:
  text-input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    height: 36px
  text-input-focused:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
  text-input-disabled:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.muted}"
    rounded: "{rounded.md}"
  text-input-placeholder:
    textColor: "{colors.muted-soft}"
  hairline-divider:
    backgroundColor: "{colors.hairline}"
    height: 1px
  hairline-soft-divider:
    backgroundColor: "{colors.hairline-soft}"
    height: 1px
  page-shell:
    backgroundColor: "{colors.app-canvas}"
  page-description:
    textColor: "{colors.body}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    height: 36px
    padding: 0 20px
  button-primary-active:
    backgroundColor: "{colors.primary-active}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
  button-primary-disabled:
    backgroundColor: "{colors.primary-disabled}"
    textColor: "{colors.muted}"
    rounded: "{rounded.md}"
  button-secondary:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    height: 36px
    padding: 0 20px
  status-success-dot:
    backgroundColor: "{colors.success}"
    rounded: "{rounded.pill}"
    size: 8px
  status-warning-dot:
    backgroundColor: "{colors.warning}"
    rounded: "{rounded.pill}"
    size: 8px
  select-option-highlighted:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-active}"
    rounded: "{rounded.sm}"
  nav-item-current:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-active}"
    rounded: "{rounded.md}"
  badge-pill:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: 4px 12px
---

## Overview

Claude 风格是 AI 产品里最"编辑部"的一支：**暖纸白画布**（营销站 `{colors.canvas}` #FAF9F5、
应用内 `{colors.app-canvas}` #F8F8F6）+ **陶土珊瑚**（`{colors.primary}` #CC785C）交互色 +
**衬线展示标题**。刻意反行业惯例：别家用冷灰蓝，它用暖米陶土；别家全无衬线，它标题用衬线。

数据来源双重互证（2026-07-04）：getdesign.md 的 Claude 专业分析（`npx getdesign add claude`，营销站蒸馏）
+ 本项目对 claude.com / claude.ai 应用的 computed style 实测，详见 spec §16.5/§16.6。
两源在 canvas 色、圆角层级、hairline 逻辑上完全吻合。dark mode 映射见 `tokens.css` claude dark block。

**Key Characteristics:**

- **无硬边框文化**：控件轮廓靠 `{colors.hairline}`（#E6DFD8，比文字浅得多的"一级台阶"边）或
  **0.5px 描边阴影 + 大扩散柔浮**（claude.ai 应用实测：`0 0 0 0.5px rgba(31,31,30,.15), 0 4px 20px rgba(0,0,0,.035)`）。
- 陶土珊瑚克制使用：主按钮、focus、链接、选中态；不做大面积装饰（后台场景下尤其如此）。
- 圆角比同类大一档：控件 8px、卡片 12px、大容器 16px。
- 标题衬线 + 正文无衬线的编辑部搭配；标题字重 400-500，从不加粗到 700。

## Colors

- **Primary (`{colors.primary}` — #CC785C)**：Anthropic 签名陶土珊瑚（getdesign 专业分析值；
  本项目原用 #C96442，Step 2R 统一为 #CC785C）。主按钮、focus 边、链接、选中文字。
  已知事实：白字 on #CC785C 对比度 3.28:1 低于 WCAG AA，Anthropic 官方接受此取舍；本项目跟随，
  但大段文字禁止用 on-primary on primary。
- **Primary Active (`{colors.primary-active}` — #A9583E)**：按下/加深态，也用作浅底上的选中文字（对比度更稳）。
- **Primary Soft (`{colors.primary-soft}` — #F8EDE7)**：选中/高亮浅底。
- **Canvas (`{colors.canvas}` — #FAF9F5)**：页面底。**纯白是破功点**——暖调是品牌本体。
- **Surface (`{colors.surface}` — #FFFFFF)**：输入框、卡片等工作面（在暖底上白面自然有层次）。
- **Surface Card (`{colors.surface-card}` — #EFE9DE)**：强调卡片/标签底，比 canvas 深一步的奶油色。
- **Ink / Body / Muted**：#141413 / #3D3D3A / #6C6A64 暖黑文字梯队，永不使用冷灰。
- **Hairline (`{colors.hairline}` — #E6DFD8)**：边框=一级表面台阶，不是墨线。

## Typography

**标题衬线是 Claude 感的辨识核心**：展示层标题走 `Cormorant Garamond, Georgia, Songti SC, serif`
（Copernicus 的开源替代栈，中文回退宋体），字重 400-500、负字距。正文/控件/表格全部无衬线
（Inter + PingFang SC）。仅页面级标题（PageScaffold 标题、登录页 slogan）用衬线，
表单 label、表头等功能文字不用——后台工具里衬线是点缀不是主体。

## Layout

4px 网格；后台密度取"常规"档（不追营销站的 96px 呼吸感）：卡片内边距 16-24px、控件高 36px。

## Elevation & Depth

**色块优先、阴影稀少**。层次靠 canvas → surface → surface-card 三级暖色表面。
需要浮起时用大扩散低透明柔影（`0 4px 20px rgba(0,0,0,.035)` 档），配 0.5px 描边阴影替代硬边框。
悬浮弹层可用 `0 1px 3px rgba(20,20,19,0.08)` 档轻影。

## Shapes

控件 `{rounded.md}` 8px、卡片 `{rounded.lg}` 12px、大容器 `{rounded.xl}` 16px、徽标 pill。
对应本项目 `--radius-factor: 1.25` 档。

## Components

- **`text-input`**：白面 + 1px `{colors.hairline}` 暖边、8px 圆角、36px 高。
  聚焦 `text-input-focused`：边框转 `{colors.primary}` + **3px 陶土色 15% 透明外环**
  （getdesign 分析值：coral-at-15%-alpha outer ring）。
- **`button-primary`**：陶土底白字、36px 高、8px 圆角。按下走 `{colors.primary-active}`。
  禁用 `{colors.primary-disabled}`（奶油化脱饱和，不是灰化）。
- **`button-secondary`**：canvas 底 + hairline 边 + ink 字。
- **`select-option-highlighted` / `nav-item-current`**：`{colors.primary-soft}` 浅陶土底 +
  `{colors.primary-active}` 深陶土字（不用 #CC785C 做小字号文字，对比度不够）。
- **`badge-pill`**：`{colors.surface-card}` 奶油底 + pill 圆角。

## Do's and Don'ts

### Do

- 画布永远是暖纸白；工作面用纯白在暖底上自然分层。
- 边框用 hairline 或描边阴影——"边是台阶，不是线"。
- 页面级标题用衬线栈；正文和功能文字保持无衬线。
- 选中态文字用 primary-active 深陶土，保住对比度。

### Don't

- 不要用纯白画布或冷灰文字——立刻变成"任何一个 AI 工具"。
- 不要给标题加粗到 700——衬线 400-500 是它的声音。
- 不要把陶土色铺成大面积装饰；它是交互信号不是背景。
- 不要用硬深色边框（#999 以深）描控件——破坏无边框文化。
