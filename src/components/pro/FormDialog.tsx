import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FieldGroup } from '@/components/ui/field';

export function FormDialogContent({
  title,
  children,
  cancelText,
  submitText,
  submitDisabled,
  onCancel,
  onSubmit,
}: {
  title: ReactNode;
  children: ReactNode;
  cancelText: ReactNode;
  submitText: ReactNode;
  submitDisabled?: boolean;
  onCancel: () => void;
  onSubmit: () => void | Promise<void>;
}) {
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
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
