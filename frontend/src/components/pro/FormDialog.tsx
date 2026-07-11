import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FieldGroup } from '@/components/ui/field';
import { cn } from '@/lib/utils';

const dialogSizeClass = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-[calc(640px*var(--app-scale))]',
};

export function FormDialogContent({
  title,
  description,
  error,
  size = 'md',
  children,
  cancelText,
  submitText,
  submitDisabled,
  submitLoading,
  onCancel,
  onSubmit,
}: {
  title: ReactNode;
  description?: string;
  error?: ReactNode;
  size?: keyof typeof dialogSizeClass;
  children: ReactNode;
  cancelText: ReactNode;
  submitText: ReactNode;
  submitDisabled?: boolean;
  submitLoading?: boolean;
  onCancel: () => void;
  onSubmit: () => void | Promise<void>;
}) {
  return (
    // 无描述时显式传 aria-describedby={undefined} 关闭 Radix 缺描述告警；有描述则交给 DialogDescription 自动挂接
    <DialogContent
      {...(description ? {} : { 'aria-describedby': undefined })}
      data-size={size}
      className={cn(dialogSizeClass[size])}
    >
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        {description ? <DialogDescription>{description}</DialogDescription> : null}
      </DialogHeader>
      <FieldGroup>
        {error ? (
          <div role="alert" className="rounded-8 bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </div>
        ) : null}
        {children}
      </FieldGroup>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          {cancelText}
        </Button>
        <Button onClick={onSubmit} disabled={submitDisabled || submitLoading} loading={submitLoading}>
          {submitText}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
