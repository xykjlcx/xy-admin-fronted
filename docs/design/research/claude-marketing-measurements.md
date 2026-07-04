# claude.com / claude.ai 实测记录（营销站 + 应用）

- 来源：claude.com（公开）、claude.ai（登录态，Chrome CDP）
- 采集：2026-07-04，getComputedStyle 实测
- 说明：claude.ai 变量全量 dump 见 claude-ai-cds-tokens.json；官方规范见 claude-mcp-design-tokens.md。
  本文件存组件级采样与两站差异记录。

## claude.com（营销站）

| 项 | 实测值 |
| --- | --- |
| body 背景 | `rgb(250, 249, 245)` `#FAF9F5` |
| 标题字体 | `anthropicSerif, "anthropicSerif Fallback", Georgia, serif` |
| 正文字体 | `anthropicSans` 系，15px 导航 |
| 正文色 | `rgb(48, 48, 46)` `#30302E` |
| 导航 CTA "Try Claude" | bg `rgb(20,20,19)` `#141413`；fg `#FAF9F5`；radius 8px；高 36-40px |
| 登录页 "Continue with email" | bg `#141413`；radius 9.6px；高 44px |

注：营销站导航/登录 CTA 为深色按钮；coral 陶土 CTA 与之并存（getdesign 分析确认 coral 为签名主按钮语义）。

## claude.ai（应用内）

| 项 | 实测值 |
| --- | --- |
| body / 侧栏背景 | `rgb(248, 248, 246)` `#F8F8F6` |
| body 字体 | `"Anthropic Sans", system-ui, "Segoe UI", Roboto...`（**产品 UI 为无衬线系统栈，衬线仅营销层**） |
| composer（输入容器） | bg 白；radius **20px**；无 border |
| composer 阴影链 | `rgba(0,0,0,0.035) 0px 4px 20px 0px, rgba(31,31,30,0.15) 0px 0px 0px 0.5px`（**0.5px 描边阴影 + 大扩散柔浮**；与官方 spec border-tertiary #1F1E1D(15%) + border-width 0.5px 互证） |
| 品牌色（CDS 变量） | `--cds-clay: #d97757`；`--cds-clay-emphasized: #c6613f`；`--accent-brand: 14.8 63.1% 59.6%`（HSL = #D97757） |
| 辅助色（官方命名） | cactus `#bcd1ca`、heather `#cbcadb`、mineral `#629987`、plum `#827dbd`、gray-650 `#454442`、gray-80 `#e7e6e1` |
| bg 阶梯（HSL 三元组） | bg-000 `0 0% 100%`(#FFF)、bg-100 `60 14% 97%`(≈#F8F8F6)、bg-200 `60 11% 95%`、bg-300 `45 12% 93%`、bg-400/500 `50 11% 89%` |
| border 系 | border-100~400 `60 2% 12%`（≈#1F1F1E 墨色基色，使用时配 alpha） |
| text 系 | text-000/100 `0 0% 7%`、text-200/300 `60 3% 21%`、text-400/500 `43 3% 47%` |
| 阴影 | `--cds-shadow-sm: 0 1px 2px 0 #0000000d`；md `0 4px 6px -1px #0000001a, 0 2px 4px -2px #0000001a`；lg `0 10px 15px -3px #0000001a, 0 4px 6px -4px #0000001a` |
| 字重 | 400 / 500 / 600 / 700（--cds-font-weight-*） |

## 三个 clay 值并存记录（拍板依据）

| 值 | 来源 |
| --- | --- |
| `#D97757` | claude.ai 产品 CDS 官方变量（--cds-clay） |
| `#CC785C` | getdesign 营销站专业分析 |
| `#C96442` | 本项目原型旧值 |
