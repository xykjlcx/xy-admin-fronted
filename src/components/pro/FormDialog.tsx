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

export function FormDialogContent({
  title,
  description,
  children,
  cancelText,
  submitText,
  submitDisabled,
  onCancel,
  onSubmit,
}: {
  title: ReactNode;
  description?: string;
  children: ReactNode;
  cancelText: ReactNode;
  submitText: ReactNode;
  submitDisabled?: boolean;
  onCancel: () => void;
  onSubmit: () => void | Promise<void>;
}) {
  return (
    // 无描述时显式传 aria-describedby={undefined} 关闭 Radix 缺描述告警；有描述则交给 DialogDescription 自动挂接
    <DialogContent {...(description ? {} : { 'aria-describedby': undefined })}>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        {description ? <DialogDescription>{description}</DialogDescription> : null}
      </DialogHeader>
      <FieldGroup>{children}</FieldGroup>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          {cancelText}
        </Button>
        <Button onClick={onSubmit} disabled={submitDisabled}>
          {submitText}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
