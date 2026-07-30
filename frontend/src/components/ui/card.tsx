import * as React from 'react';

import { cn } from '@/lib/utils';

// Card 原语：结构照 shadcn 官方惯例（data-slot 齐全），几何全走 --card-* 挂点。
// spacing 是内容语义，不是主题或用户密度轴；业务层只能选受控档位，不能覆盖 Card padding。

type CardSpacing = 'compact' | 'default' | 'comfortable';

function Card({
  className,
  spacing = 'default',
  ...props
}: React.ComponentProps<'div'> & { spacing?: CardSpacing }) {
  return (
    <div
      data-slot="card"
      data-spacing={spacing}
      className={cn(
        'flex flex-col gap-(--card-spacing) rounded-(--card-radius) border border-border bg-surface py-(--card-spacing) text-text shadow-(--card-shadow)',
        spacing === 'compact' && '[--card-spacing:var(--card-spacing-compact)]',
        spacing === 'comfortable' && '[--card-spacing:var(--card-spacing-comfortable)]',
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        'grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-(--card-spacing)',
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  // 字号/字重取现状页面卡片标题惯例（dashboard text-base/semibold）；uppercase/tracking 走 --title-* 挂点
  // （默认 none/normal 零视觉变化，与 dialog title 共用，sera 批2 兑现）。
  return (
    <div
      data-slot="card-title"
      className={cn('text-base font-semibold text-text [text-transform:var(--title-transform)] [letter-spacing:var(--title-tracking)]', className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="card-description" className={cn('text-sm text-text-3', className)} {...props} />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn('col-start-2 row-span-2 row-start-1 self-start justify-self-end', className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-content" className={cn('px-(--card-spacing)', className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn('flex items-center px-(--card-spacing) [.border-t]:pt-(--card-spacing)', className)}
      {...props}
    />
  );
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction };
