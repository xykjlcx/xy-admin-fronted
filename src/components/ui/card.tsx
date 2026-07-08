import * as React from 'react';

import { cn } from '@/lib/utils';

// Card 原语：结构照 shadcn 官方惯例（data-slot 齐全），几何全走 --card-* 挂点。
// spacing/radius/shadow 三 flavor 统一（S4 值=统一档），flavor 档差 S5 sera 激活。
// 局部 [--card-spacing:...] 变量模式不采用——直接消费全局 token，更简单。

function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card"
      className={cn(
        'flex flex-col gap-(--card-spacing) rounded-(--card-radius) border border-border bg-surface py-(--card-spacing) text-text shadow-(--card-shadow)',
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
  // 字号/字重取现状页面卡片标题惯例（dashboard text-base/semibold）；不引入 uppercase/tracking（sera 的活）。
  return (
    <div data-slot="card-title" className={cn('text-base font-semibold text-text', className)} {...props} />
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
