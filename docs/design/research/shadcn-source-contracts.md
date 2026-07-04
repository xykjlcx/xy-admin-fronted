# shadcn/ui 官方源码合同（new-york-v4 / radix 线）

- 来源：github.com/shadcn-ui/ui · apps/v4/registry/new-york-v4/ui/
- 采集：2026-07-04，gh api（源码原样，未改动）
- 说明：本项目 components.json = style new-york + radix-ui，此源码即官方状态合同权威

## input.tsx

```tsx
import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
```

## button.tsx

```tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
```

## ui.shadcn.com 官网实测（2026-07-04，computed style）

注意：官网组件文档页现默认展示 **Base UI 新线**（/docs/components/base/*），其值与 radix 线源码不同。

### base 线 input demo（/docs/components/base/input 实测）

| 状态 | 值 |
| --- | --- |
| base | bg transparent；border 1px lab(90.952)≈zinc-200；radius 10px；h 32px；14px/20px；px 10px；shadow none |
| focus | border 变 lab(66.128)≈zinc-500 中灰；ring `oklab(0.708 ... / 0.5) 0 0 0 3px`（≈zinc-400 @ 50% 半透明晕染）；bg 仍透明 |

### base 线 button demo 实测

| variant | 值 |
| --- | --- |
| primary | bg lab(0)=纯黑；radius 10px；h 32px；14px/500 |
| outline/default | bg 白 + zinc-200 边 |
| secondary | bg lab(96.52)≈zinc-100 |

### 关键差异结论

- **radix / new-york-v4 源码（本文件上方，即本项目对标线）：input h-9=36px、button default h-9=36px、sm h-8=32px**。
- 官网 demo 的 32px 为 Base UI 线取值，勿混用。
- dark 合同（源码 + zinc registry）：input `dark:bg-input/30`（--input=白@15% 的 30% 叠加）；border 白@10%；invalid ring `destructive/20`（dark /40）。
