import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type { CreateRoleInput } from '@/modules/admin/roles/api';
import { emptyRoleDraft } from '../model';

export function CreateRoleDialog({
  open,
  onOpenChange,
  onCreateRole,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateRole: (dto: CreateRoleInput) => void | Promise<void>;
}) {
  return <RoleDialog open={open} onOpenChange={onOpenChange} onSubmit={onCreateRole} />;
}

export function EditRoleDialog({
  open,
  role,
  onOpenChange,
  onUpdateRole,
}: {
  open: boolean;
  role: { id: string; name: string; desc: string } | null;
  onOpenChange: (open: boolean) => void;
  onUpdateRole: (id: string, dto: CreateRoleInput) => void | Promise<void>;
}) {
  return (
    <RoleDialog
      key={role?.id ?? 'no-role'}
      open={open}
      initial={role ? { name: role.name, desc: role.desc } : undefined}
      title="roles.dialog.editRoleTitle"
      submitLabel="roles.actions.confirmUpdate"
      onOpenChange={onOpenChange}
      onSubmit={(dto) => (role ? onUpdateRole(role.id, dto) : undefined)}
    />
  );
}

function RoleDialog({ open, initial, title = 'roles.dialog.addRoleTitle', submitLabel = 'roles.actions.confirmCreate', onOpenChange, onSubmit }: {
  open: boolean;
  initial?: CreateRoleInput;
  title?: string;
  submitLabel?: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (dto: CreateRoleInput) => void | Promise<void>;
}) {
  const { t } = useTranslation('admin');
  const [roleDraft, setRoleDraft] = useState<CreateRoleInput>(initial ?? { ...emptyRoleDraft });
  const [submitting, setSubmitting] = useState(false);
  const close = () => {
    onOpenChange(false);
    setRoleDraft({ ...emptyRoleDraft });
  };
  const submitCreateRole = async () => {
    const dto = { name: roleDraft.name.trim(), desc: roleDraft.desc?.trim() };
    if (!dto.name) return;
    // 防重复提交：在途时忽略后续点击，避免慢网下连点创建出多条角色。
    if (submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(dto);
    } catch {
      // 失败时保留弹窗，错误 toast 由全局 MutationCache 兜底。
      return;
    } finally {
      setSubmitting(false);
    }
    close();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) setRoleDraft({ ...emptyRoleDraft });
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t(title)}</DialogTitle>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel required>{t('roles.form.roleName')}</FieldLabel>
            <Input
              placeholder={t('roles.form.roleNamePlaceholder')}
              value={roleDraft.name}
              onChange={(event) => setRoleDraft((current) => ({ ...current, name: event.target.value }))}
            />
          </Field>
          <Field>
            <FieldLabel>{t('roles.form.roleDesc')}</FieldLabel>
            <Input
              placeholder={t('roles.form.roleDescPlaceholder')}
              value={roleDraft.desc ?? ''}
              onChange={(event) => setRoleDraft((current) => ({ ...current, desc: event.target.value }))}
            />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={close}>
            {t('roles.actions.cancel')}
          </Button>
          <Button onClick={submitCreateRole} loading={submitting} disabled={!roleDraft.name.trim()}>
            {t(submitLabel)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
