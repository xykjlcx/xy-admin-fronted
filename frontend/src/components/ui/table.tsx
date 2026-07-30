'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

interface TableProps extends React.ComponentProps<'table'> {
  containerClassName?: string;
}

function Table({ className, containerClassName, ...props }: TableProps) {
  return (
    <div
      data-slot="table-container"
      className={cn('relative w-full overflow-x-auto', containerClassName)}
    >
      <table
        data-slot="table"
        className={cn('w-full table-fixed caption-bottom bg-(--table-bg) text-sm text-(--table-row-fg)', className)}
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn('[&_tr]:border-b [&_tr]:bg-(--table-header-bg)', className)}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn('[&_tr:last-child]:border-0', className)}
      {...props}
    />
  );
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        'border-t bg-(--table-header-bg) font-medium [&>tr]:last:border-b-0',
        className,
      )}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        'ui-table-row border-b border-(--table-row-border) transition-colors',
        className,
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        'h-(--table-header-h) px-(--table-cell-px) text-left align-middle text-xs font-medium whitespace-nowrap text-(--table-header-fg) [text-transform:var(--table-header-transform)] [letter-spacing:var(--table-header-tracking)]',
        className,
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        'h-(--table-row-h) px-(--table-cell-px) align-middle whitespace-nowrap',
        className,
      )}
      {...props}
    />
  );
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn('mt-4 text-sm text-(--table-header-fg)', className)}
      {...props}
    />
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
