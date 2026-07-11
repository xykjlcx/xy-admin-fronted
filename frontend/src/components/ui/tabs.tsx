import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Tabs as TabsPrimitive } from 'radix-ui';

import { cn } from '@/lib/utils';

function Tabs({
  className,
  orientation = 'horizontal',
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        'group/tabs flex gap-2 data-[orientation=horizontal]:flex-col',
        className,
      )}
      {...props}
    />
  );
}

const tabsListVariants = cva(
  [
    'group/tabs-list inline-flex w-fit items-center justify-center rounded-8 p-[calc(3px*var(--app-scale))] text-(--tabs-seg-trigger-fg)',
    'group-data-[orientation=horizontal]/tabs:h-[var(--control-md)] group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col',
    'data-[variant=line]:h-auto data-[variant=line]:rounded-none data-[variant=line]:p-0',
  ].join(' '),
  {
    variants: {
      variant: {
        default: 'bg-(--tabs-seg-list-bg)',
        line: 'gap-6 border-b border-(--tabs-line-border) bg-transparent',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function TabsList({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        [
          'relative inline-flex h-[calc(100%-1px)] flex-1 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-6 border border-transparent px-3 py-1 text-sm font-medium text-(--tabs-seg-trigger-fg) outline-none transition-[background,border-color,color,box-shadow]',
          'hover:text-(--tabs-seg-trigger-fg-hover) focus-visible:ring-[length:var(--focus-ring)] focus-visible:ring-(--tabs-ring) disabled:pointer-events-none disabled:opacity-50',
          'group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start',
          'data-[state=active]:bg-(--tabs-seg-trigger-bg-active) data-[state=active]:text-(--tabs-seg-trigger-fg-active) data-[state=active]:shadow-(--tabs-seg-trigger-shadow-active)',
          'group-data-[variant=line]/tabs-list:rounded-none group-data-[variant=line]/tabs-list:border-0 group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:px-1 group-data-[variant=line]/tabs-list:pb-3',
          'ui-tabs-line-trigger group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent group-data-[variant=line]/tabs-list:data-[state=active]:shadow-none',
          'after:absolute after:bg-(--tabs-line-indicator) after:opacity-0 after:transition-[opacity,transform] after:duration-200 after:ease-out motion-reduce:after:transition-none',
          'group-data-[orientation=horizontal]/tabs:after:inset-x-0 group-data-[orientation=horizontal]/tabs:after:bottom-[-1px] group-data-[orientation=horizontal]/tabs:after:h-[calc(2px*var(--app-scale))] group-data-[orientation=horizontal]/tabs:after:rounded-full',
          'group-data-[orientation=vertical]/tabs:after:inset-y-0 group-data-[orientation=vertical]/tabs:after:-right-1 group-data-[orientation=vertical]/tabs:after:w-[calc(2px*var(--app-scale))]',
          'group-data-[variant=line]/tabs-list:data-[state=active]:after:opacity-100',
          '[&_[data-icon]]:pointer-events-none [&_[data-icon]]:shrink-0 [&_[data-icon]]:size-[calc(15px*var(--app-scale))]',
        ].join(' '),
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn('flex-1 outline-none', className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants };
