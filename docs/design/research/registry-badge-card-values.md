# shadcn 官方 registry — badge / card 五 style 设计值对照表

- 抓取日期:2026-07-08
- 端点模式:`https://ui.shadcn.com/r/styles/{style}/{component}.json`(取 `files[].content` 中的 tsx 源码)
- styles:`base-nova`、`base-maia`、`base-luma`、`base-lyra`、`base-sera`(均带 `base-` 前缀直接命中,无需回退)
- components:`badge`、`card`
- 抓取结果:**10/10 实抓成功,无缺失项**。以下所有格均为一手数据,原文引用见文末。
- 说明:`base-*` 是 shadcn 官方 registry 内部风格代号,与本仓库 flavor(`feishu`/`claude`/`shadcn`/未来 `sera`)命名**无对应关系**,本文档不做映射,只呈现原始抓取值。

---

## 一、Badge 对照表

| 维度 | base-nova | base-maia | base-luma | base-lyra | base-sera |
|---|---|---|---|---|---|
| 圆角 | `rounded-4xl` | `rounded-4xl` | `rounded-3xl` | `rounded-none` | `rounded-none`(实际无 rounded class,方形) |
| 水平/垂直 padding | `px-2 py-0.5` | `px-2 py-0.5` | `px-2 py-0.5` | `px-2 py-0.5` | `px-0 py-0` |
| 字号 | `text-xs`(12px) | `text-xs`(12px) | `text-xs`(12px) | `text-xs`(12px) | `text-[0.625rem]`(10px) |
| 字重 | `font-medium` | `font-medium` | `font-medium` | `font-medium` | `font-semibold` |
| text-transform | 无 | 无 | 无 | 无 | `uppercase` |
| letter-spacing | 无 | 无 | 无 | 无 | `tracking-widest` |
| 边框 | `border border-transparent`(结构占位,default 不可见;`outline` variant 用 `border-border`) | `border border-transparent`(同左) | `border border-transparent`(同左) | `border border-transparent`(同左) | `border-0`(彻底无边框,`outline` variant 也不加边框) |
| 背景策略(default variant) | 实底 `bg-primary` | 实底 `bg-primary` | 实底 `bg-primary` | 实底 `bg-primary` | 无背景 `bg-transparent`,仅文字变色 |
| 背景策略(secondary/destructive/outline) | secondary 实底 `bg-secondary`;destructive 软底 `bg-destructive/10`;outline 透明 + `border-border` | 同 nova;outline 额外 `bg-input/30`(浅灰底) | 同 nova | 同 nova | 全部无背景,仅 `text-*` 颜色区分(secondary/destructive/outline/ghost 都不加 bg/border) |
| 高度/行高 | `h-5`(20px 固定高度) | `h-5` | `h-5` | `h-5` | 无固定高度,随 `text-[0.625rem]` 行高走(非 pill 造型) |
| 其他结构 | `inline-flex … gap-1 overflow-hidden … whitespace-nowrap`,`[&>svg]:size-3!` | 同 nova | 同 nova | 同 nova | `gap-1.5`(比其他 4 style 略大),`[&>svg]:size-3!` 相同 |

**关键分歧**:nova/maia/luma/lyra 四个 style 是同一套"实心 pill/chip"设计(仅圆角量不同:4xl/4xl/3xl/none),badge 视觉参数(padding/字号/字重/高度/边框结构)完全一致,唯二差异是**圆角**和 maia 的 outline 变体多一层 `bg-input/30`。base-sera 是完全不同的**类型**分支:无背景、无边框、无固定高度,uppercase + tracking-widest + 更小字号,是"文字标签"而非"色块徽章"的设计语言。

---

## 二、Card 对照表

| 维度 | base-nova | base-maia | base-luma | base-lyra | base-sera |
|---|---|---|---|---|---|
| Card 圆角 | `rounded-xl` | `rounded-2xl` | `rounded-4xl` | `rounded-none` | 无 rounded class(方形) |
| `--card-spacing`(内距变量,default/sm) | `spacing(4)` / `spacing(3)` | `spacing(6)` / `spacing(4)` | `spacing(6)` / `spacing(4)` | `spacing(4)` / `spacing(3)` | `spacing(8)` / `spacing(5)` |
| Card 垂直内距 | `py-(--card-spacing)` = py-4/py-3 | py-6/py-4 | py-6/py-4 | py-4/py-3 | py-8/py-5 |
| Card 阴影 | 无 shadow class | 无 shadow class | `shadow-md` | 无 shadow class | `shadow-sm` |
| Card 边框/环 | `ring-1 ring-foreground/10`(无 border) | `ring-1 ring-foreground/10` | `ring-1 ring-foreground/5` | `ring-1 ring-foreground/10` | `ring-1 ring-foreground/5` |
| Card 正文字号 | `text-sm` | `text-sm` | `text-sm` | `text-xs/relaxed`(唯一非 text-sm,且带 relaxed 行高) | `text-sm` |
| CardHeader padding | `px-(--card-spacing)` | 同 | 同 | 同 | 同 |
| CardHeader gap | `gap-1` | `gap-2` | `gap-1.5` | `gap-1` | `gap-1.5` |
| CardTitle 字号 | `text-base leading-snug`(sm size 降级 `text-sm`) | `text-base` | `text-base` | `text-sm`(sm size 仍 `text-sm`) | `text-lg` |
| CardTitle 字重 | `font-medium` | `font-medium` | `font-medium` | `font-medium` | `font-semibold` |
| CardTitle transform | 无 | 无 | 无 | 无 | `uppercase` |
| CardTitle tracking | 无 | 无 | 无 | 无 | `tracking-wider` |
| CardTitle 其他 | `cn-font-heading` | `cn-font-heading` | `cn-font-heading` | `cn-font-heading` | `cn-font-heading` |
| CardContent padding | `px-(--card-spacing)` | 同 | 同 | 同 | 同 |
| CardFooter padding | `p-(--card-spacing)`(四边全内距) | `px-(--card-spacing)` + 条件 `[.border-t]:pt-(--card-spacing)` | `px-(--card-spacing)` + 条件 `[.border-t]:pt-(--card-spacing)` | `p(--card-spacing)`(四边全内距) | `px-(--card-spacing)` + 条件 `[.border-t]:pt-(--card-spacing)` |
| CardFooter 边框 | `border-t bg-muted/50`(**默认自带**分隔线 + 灰底) | 无默认边框(仅 class 里出现 `.border-t` 时才加 pt) | 无默认边框(同上,条件式) | `border-t`(**默认自带**分隔线,但无 bg-muted) | 无默认边框(条件式) |
| CardFooter 圆角继承 | `rounded-b-xl` | `rounded-b-xl` | `rounded-b-4xl` | `rounded-none` | 无 |

**关键分歧**:
- 圆角量从大到小:luma(4xl) > maia(2xl) > nova(xl) > lyra/sera(无圆角,方形)。
- 阴影只有 luma(`shadow-md`)和 sera(`shadow-sm`)有,其余三个纯靠 `ring-1` 做边界,无投影。
- 内距密度:sera 最松(spacing 8/5),maia/luma 中等(6/4),nova/lyra 最紧凑(4/3)。
- lyra 是唯一把 Card 正文字号降到 `text-xs` 的 style(其余都是 `text-sm`),且 CardTitle 也是 5 个里最小的(`text-sm`)。
- sera 的 CardTitle 走 `uppercase + tracking-wider + text-lg + font-semibold`,与其 badge 的 uppercase 语言一致,是唯一带 text-transform 的 style。
- Footer 边框是否默认展示分两派:nova/lyra 默认有 `border-t`(nova 还带 `bg-muted/50` 底色区分),maia/luma/sera 默认无边框、仅在外部传入 `.border-t` class 时才通过 `[.border-t]:pt-(--card-spacing)` 选择器加内距。

---

## 三、原文引用(裁剪到相关部分)

### base-nova / badge.tsx
```tsx
const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary: "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive: "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        outline: "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost: "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: { variant: "default" },
  }
)
```

### base-nova / card.tsx
```tsx
// Card
"group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-xl bg-card py-(--card-spacing) text-sm text-card-foreground ring-1 ring-foreground/10 [--card-spacing:--spacing(4)] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(3)] data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl"
// CardHeader
"group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)"
// CardTitle
"cn-font-heading text-base leading-snug font-medium group-data-[size=sm]/card:text-sm"
// CardContent
"px-(--card-spacing)"
// CardFooter
"flex items-center rounded-b-xl border-t bg-muted/50 p-(--card-spacing)"
```

### base-maia / badge.tsx
```tsx
const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary: "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive: "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        outline: "border-border bg-input/30 text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost: "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: { variant: "default" },
  }
)
```

### base-maia / card.tsx
```tsx
// Card
"group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-2xl bg-card py-(--card-spacing) text-sm text-card-foreground ring-1 ring-foreground/10 [--card-spacing:--spacing(6)] has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(4)] *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl"
// CardHeader
"group/card-header @container/card-header grid auto-rows-min items-start gap-2 rounded-t-xl px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)"
// CardTitle
"cn-font-heading text-base font-medium"
// CardContent
"px-(--card-spacing)"
// CardFooter
"flex items-center rounded-b-xl px-(--card-spacing) [.border-t]:pt-(--card-spacing)"
```

### base-luma / badge.tsx
```tsx
const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-3xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary: "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive: "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        outline: "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost: "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: { variant: "default" },
  }
)
```

### base-luma / card.tsx
```tsx
// Card
"group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-4xl bg-card py-(--card-spacing) text-sm text-card-foreground shadow-md ring-1 ring-foreground/5 [--card-spacing:--spacing(6)] has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(4)] dark:ring-foreground/10 *:[img:first-child]:rounded-t-4xl *:[img:last-child]:rounded-b-4xl"
// CardHeader
"group/card-header @container/card-header grid auto-rows-min items-start gap-1.5 rounded-t-4xl px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)"
// CardTitle
"cn-font-heading text-base font-medium"
// CardContent
"px-(--card-spacing)"
// CardFooter
"flex items-center rounded-b-4xl px-(--card-spacing) [.border-t]:pt-(--card-spacing)"
```

### base-lyra / badge.tsx
```tsx
const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-none border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary: "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive: "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        outline: "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost: "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: { variant: "default" },
  }
)
```

### base-lyra / card.tsx
```tsx
// Card
"group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-none bg-card py-(--card-spacing) text-xs/relaxed text-card-foreground ring-1 ring-foreground/10 [--card-spacing:--spacing(4)] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(3)] data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-none *:[img:last-child]:rounded-none"
// CardHeader
"group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-none px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)"
// CardTitle
"cn-font-heading text-sm font-medium group-data-[size=sm]/card:text-sm"
// CardContent
"px-(--card-spacing)"
// CardFooter
"flex items-center rounded-none border-t p-(--card-spacing)"
```

### base-sera / badge.tsx
```tsx
const badgeVariants = cva(
  "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-none border-0 bg-transparent px-0 py-0 text-[0.625rem] font-semibold tracking-widest whitespace-nowrap uppercase transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-0 has-data-[icon=inline-start]:pl-0 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "text-foreground [a]:hover:text-foreground/70",
        secondary: "text-muted-foreground [a]:hover:text-foreground",
        destructive: "text-destructive focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:text-destructive/70",
        outline: "text-foreground [a]:hover:text-foreground/70",
        ghost: "text-muted-foreground hover:text-foreground",
        link: "text-foreground underline-offset-4 hover:underline",
      },
    },
    defaultVariants: { variant: "default" },
  }
)
```

### base-sera / card.tsx
```tsx
// Card
"group/card flex flex-col gap-(--card-spacing) overflow-hidden bg-card py-(--card-spacing) text-sm text-card-foreground shadow-sm ring-1 ring-foreground/5 [--card-spacing:--spacing(8)] has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(5)] *:[img:first-child]:rounded-none *:[img:last-child]:rounded-none"
// CardHeader
"group/card-header @container/card-header grid auto-rows-min items-start gap-1.5 rounded-none px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)"
// CardTitle
"cn-font-heading text-lg font-semibold tracking-wider uppercase"
// CardContent
"px-(--card-spacing)"
// CardFooter
"flex items-center px-(--card-spacing) [.border-t]:pt-(--card-spacing)"
```
