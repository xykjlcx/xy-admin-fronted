import * as React from "react"
import { XIcon } from "lucide-react"
import { Dialog as DialogPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "anim-ovl-fade fixed inset-0 z-50 bg-(--overlay-mask-bg) backdrop-blur-[var(--overlay-mask-blur)]",
        className
      )}
      {...props}
    />
  )
}

type DialogContentProps = React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
  closeOnInteractOutside?: boolean
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  closeOnInteractOutside = false,
  onPointerDownOutside,
  onInteractOutside,
  ...props
}: DialogContentProps) {
  const handlePointerDownOutside: NonNullable<DialogContentProps["onPointerDownOutside"]> = (event) => {
    onPointerDownOutside?.(event)
    if (!closeOnInteractOutside && !event.defaultPrevented) {
      event.preventDefault()
    }
  }
  const handleInteractOutside: NonNullable<DialogContentProps["onInteractOutside"]> = (event) => {
    onInteractOutside?.(event)
    if (!closeOnInteractOutside && !event.defaultPrevented) {
      event.preventDefault()
    }
  }

  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        {...props}
        data-slot="dialog-content"
        className={cn(
          "anim-modal-in-lg fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-14 border border-(--overlay-border) bg-(--overlay-bg) p-6 text-(--overlay-fg) shadow-(--overlay-shadow-modal) outline-none sm:max-w-lg",
          className
        )}
        onPointerDownOutside={handlePointerDownOutside}
        onInteractOutside={handleInteractOutside}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="absolute right-6 top-[calc(22px*var(--app-scale))] flex size-[calc(30px*var(--app-scale))] cursor-pointer items-center justify-center rounded-7 text-(--overlay-close-fg) outline-none transition-colors hover:bg-(--overlay-close-bg-hover) hover:text-(--overlay-close-fg-hover) focus-visible:ring-[length:var(--focus-ring)] focus-visible:ring-(--button-ring) disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none"
          >
            <XIcon className="size-[calc(18px*var(--app-scale))]" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="outline">Close</Button>
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
