# 三体系设计数据存档（原始采集，无损）

2026-07-04 采集。是 `docs/design/*.design.md` 身份文档与 spec §10.2 值表的原始数据层——
值表任何单元格应可追溯到本目录某文件。数据为当日快照，站点改版后需重采（方法见 spec §16.5）。

## feishu

- `feishu-ud-tokens.json` — 飞书主应用（feishu.cn/next/messenger）UD 变量**全量 dump**：13273 个定义、13195 个 resolved。含 N/B 全色阶及 alpha 变体、primary/danger/success/warning 状态四件套、fill 交互态（hover=N900@8%）、line 边框两级、text 梯队、bg 体系。
- `feishu-admin-measurements.md` — admin.feishu.cn 组件级实测（admin 不用 CSS 变量）：输入框灰底反转合同、按钮 32px/400、表头透明底。

## claude

- `claude-mcp-design-tokens.md` — **Anthropic 官方** MCP Apps Design Token 规范全表（背景/文字/边框/ring 各 6 级 + 语义色，light/dark 双模式，0.5px 边框，圆角/阴影/字号全套）。
- `claude-ai-cds-tokens.json` — claude.ai 应用 CDS 变量全量 dump：1308 个定义、544 个 resolved（--cds-clay #D97757 等）。
- `claude-marketing-measurements.md` — claude.com 营销站 + claude.ai 组件实测（composer 0.5px 描边阴影链、三个 clay 值并存记录）。
- `claude-getdesign-analysis.md` — getdesign.md 的 Claude 专业分析原文（`npx getdesign add claude` 产物，营销站蒸馏）。

## shadcn

- `shadcn-source-contracts.md` — shadcn-ui/ui **new-york-v4 源码原文**（input/button，本项目对标线）+ 官网 Base UI 线实测对照 + radix/base 两线差异结论。
- `shadcn-zinc-theme.json` — 官方 zinc 主题 registry 原始 JSON（cssVars light/dark + v4 oklch 全套）。

## 跨体系核心发现

三家产品级交互态/边框均为 **alpha 混合体系**（飞书 N900@8%/12%、Claude #1F1E1D@40/30/15%、shadcn dark 白@10%），非实色——dark mode 自动成立。这是"真实设计体系"与"换配色"的工程级分水岭。
