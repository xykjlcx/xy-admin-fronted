import * as React from "react"
import { XIcon } from "lucide-react"
import { Dialog as SheetPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        // 原型遮罩（L2651）：rgba(0,0,0,.22) + backdrop-blur(6px) + ovl-fade .2s
        "anim-ovl-fade fixed inset-0 z-50 bg-(--overlay-mask-bg) backdrop-blur-[var(--overlay-mask-blur)]",
        className
      )}
      {...props}
    />
  )
}

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left"
  showCloseButton?: boolean
}) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          "fixed z-50 flex flex-col gap-4 bg-(--overlay-bg) text-(--overlay-fg)",
          // 抽屉阴影纳入 overlay 族，后续只调整 token，不在组件里散落阴影实现。
          side === "right" &&
            "anim-sheet-in-right inset-y-0 right-0 h-full w-3/4 border-l border-(--overlay-border) shadow-(--overlay-shadow-modal) sm:max-w-sm",
          side === "left" &&
            "inset-y-0 left-0 h-full w-3/4 border-r border-(--overlay-border) data-[state=open]:animate-in data-[state=open]:slide-in-from-left data-[state=open]:duration-300 sm:max-w-sm",
          side === "top" &&
            "inset-x-0 top-0 h-auto border-b border-(--overlay-border) data-[state=open]:animate-in data-[state=open]:slide-in-from-top data-[state=open]:duration-300",
          side === "bottom" &&
            "inset-x-0 bottom-0 h-auto border-t border-(--overlay-border) data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom data-[state=open]:duration-300",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          // 原型抽屉关闭钮（L2658）：30px 圆角方块（7px）+ ✕，无边框，走 overlay close token
          <SheetPrimitive.Close
            data-slot="sheet-close"
            className="absolute right-6 top-[calc(22px*var(--app-scale))] flex size-[calc(30px*var(--app-scale))] cursor-pointer items-center justify-center rounded-7 text-(--overlay-close-fg) outline-none transition-colors hover:bg-(--overlay-close-bg-hover) hover:text-(--overlay-close-fg-hover) focus-visible:ring-[length:var(--focus-ring)] focus-visible:ring-(--button-ring) disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none"
          >
            <XIcon className="size-[calc(18px*var(--app-scale))]" />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1.5 p-4", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  )
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("font-semibold text-foreground", className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
