# Anthropic 官方 MCP Apps Design Token Specification（全表存档）

- 来源：https://claude.com/docs/connectors/building/mcp-apps/design-guidelines
- 采集：2026-07-04，WebFetch 提取（表格原样誊写，无删减）
- 性质：**官方规范级**——Anthropic 为第三方 MCP Apps 嵌入 claude.ai 提供的设计 token 规范，
  即 claude.ai 产品视觉的官方合同。与 claude.ai DOM 实测（claude-ai-cds-tokens.json）互证：
  实测 composer 描边 `rgba(31,31,30,0.15) 0 0 0 0.5px` = 本表 border-tertiary #1F1E1D(15%) + border-width-regular 0.5px。

## Color Tokens

### Background Colors

| Token | Light | Dark |
|-------|-------|------|
| `color-background-primary` | `#FFFFFF` | `#30302E` |
| `color-background-secondary` | `#F5F4ED` | `#262624` |
| `color-background-tertiary` | `#FAF9F5` | `#141413` |
| `color-background-inverse` | `#141413` | `#FAF9F5` |
| `color-background-ghost` | `#FFFFFF (0%)` | `#30302E (0%)` |
| `color-background-disabled` | `#FFFFFF (50%)` | `#30302E (50%)` |

### Semantic Background Colors

| Token | Light | Dark |
|-------|-------|------|
| `color-background-info` | `#D6E4F6` | `#253E5F` |
| `color-background-danger` | `#F7ECEC` | `#602A28` |
| `color-background-success` | `#E9F1DC` | `#1B4614` |
| `color-background-warning` | `#F6EEDF` | `#483A0F` |

### Text Colors

| Token | Light | Dark |
|-------|-------|------|
| `color-text-primary` | `#141413` | `#FAF9F5` |
| `color-text-secondary` | `#3D3D3A` | `#C2C0B6` |
| `color-text-tertiary` | `#73726C` | `#9C9A92` |
| `color-text-inverse` | `#FFFFFF` | `#141413` |
| `color-text-ghost` | `#73726C (50%)` | `#9C9A92 (50%)` |
| `color-text-disabled` | `#141413 (50%)` | `#FAF9F5 (50%)` |

### Semantic Text Colors

| Token | Light | Dark |
|-------|-------|------|
| `color-text-info` | `#3266AD` | `#80AADD` |
| `color-text-danger` | `#7F2C28` | `#EE8884` |
| `color-text-success` | `#265B19` | `#7AB948` |
| `color-text-warning` | `#5A4815` | `#D1A041` |

### Border Colors

| Token | Light | Dark |
|-------|-------|------|
| `color-border-primary` | `#1F1E1D (40%)` | `#DEDCD1 (40%)` |
| `color-border-secondary` | `#1F1E1D (30%)` | `#DEDCD1 (30%)` |
| `color-border-tertiary` | `#1F1E1D (15%)` | `#DEDCD1 (15%)` |
| `color-border-inverse` | `#FFFFFF (30%)` | `#141413 (15%)` |
| `color-border-ghost` | `#1F1E1D (0%)` | `#DEDCD1 (0%)` |
| `color-border-disabled` | `#1F1E1D (10%)` | `#DEDCD1 (10%)` |

### Semantic Border Colors

| Token | Light | Dark |
|-------|-------|------|
| `color-border-info` | `#4682D5` | `#4682D5` |
| `color-border-danger` | `#A73D39` | `#CD5C58` |
| `color-border-success` | `#437426` | `#599130` |
| `color-border-warning` | `#805C1F` | `#A87829` |

### Ring Colors (Focus States)

| Token | Light | Dark |
|-------|-------|------|
| `color-ring-primary` | `#141413 (70%)` | `#FAF9F5 (70%)` |
| `color-ring-secondary` | `#3D3D3A (70%)` | `#C2C0B6 (70%)` |
| `color-ring-inverse` | `#FFFFFF (70%)` | `#141413 (70%)` |
| `color-ring-info` | `#3266AD (50%)` | `#80AADD (50%)` |
| `color-ring-danger` | `#A73D39 (50%)` | `#CD5C58 (50%)` |
| `color-ring-success` | `#437426 (50%)` | `#599130 (50%)` |
| `color-ring-warning` | `#805C1F (50%)` | `#A87829 (50%)` |

## Typography Tokens

### Font Family

- `font-sans`: `"Anthropic Sans, sans-serif"`
- `font-mono`: `"ui-monospace, monospace"`

### Font Weight

- `font-weight-normal`: `400`
- `font-weight-medium`: `500`
- `font-weight-semibold`: `600`
- `font-weight-bold`: `700`

### Font Size

- `font-text-xs-size`: `12px`
- `font-text-sm-size`: `14px`
- `font-text-md-size`: `16px`
- `font-text-lg-size`: `20px`
- `font-heading-xs-size`: `12px`
- `font-heading-sm-size`: `14px`
- `font-heading-md-size`: `16px`
- `font-heading-lg-size`: `20px`
- `font-heading-xl-size`: `24px`
- `font-heading-2xl-size`: `28px`
- `font-heading-3xl-size`: `36px`

### Line Height

| Token | Value |
|-------|-------|
| `font-text-xs-line-height` | `1.4` |
| `font-text-sm-line-height` | `1.4` |
| `font-text-md-line-height` | `1.4` |
| `font-text-lg-line-height` | `1.25` |
| `font-heading-xs-line-height` | `1.4` |
| `font-heading-sm-line-height` | `1.4` |
| `font-heading-md-line-height` | `1.4` |
| `font-heading-lg-line-height` | `1.25` |
| `font-heading-xl-line-height` | `1.25` |
| `font-heading-2xl-line-height` | `1.1` |
| `font-heading-3xl-line-height` | `1` |

## Spacing & Dimension Tokens

### Border Radius

- `border-radius-xs`: `4px`
- `border-radius-sm`: `6px`
- `border-radius-md`: `8px`
- `border-radius-lg`: `10px`
- `border-radius-xl`: `12px`
- `border-radius-full`: `9999px`

### Border Width

- `border-width-regular`: `0.5px`

### Shadow

- `shadow-hairline`: `0 1px 2px 0 rgba(0, 0, 0, 0.05)`
- `shadow-sm`: `0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)`
- `shadow-md`: `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)`
- `shadow-lg`: `0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)`

## Component Guidelines（原文摘录）

- **Text controls:** Use "visible controls like segmented buttons, toggles, or inline options" rather than hidden menus to avoid conflicts with hosting containers.
- **Inline cards:** Maximum 2 actions positioned at bottom; support 4-5 data points; 44pt minimum touch targets on mobile.
- **Icons:** "Monochromatic, outlined icons that match the host's icon color tokens."
