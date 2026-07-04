import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import type { CreateAdminRoleInput, CreateRoleInput } from '@/modules/admin/api/role.api';
import { emptyAdminDraft, emptyRoleDraft } from './model';
import type { SelectableMemberDto } from './types';

export function CreateRoleDialog({
  open,
  onOpenChange,
  onCreateRole,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateRole: (dto: CreateRoleInput) => void | Promise<void>;
}) {
  const { t } = useTranslation('admin');
  const [roleDraft, setRoleDraft] = useState<CreateRoleInput>({ ...emptyRoleDraft });
  const close = () => {
    onOpenChange(false);
    setRoleDraft({ ...emptyRoleDraft });
  };
  const submitCreateRole = async () => {
    const dto = { name: roleDraft.name.trim(), desc: roleDraft.desc?.trim() };
    if (!dto.name) return;
    await onCreateRole(dto);
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
          <DialogTitle>{t('roles.dialog.addRoleTitle')}</DialogTitle>
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
          <Button onClick={submitCreateRole} disabled={!roleDraft.name.trim()}>
            {t('roles.actions.confirmCreate')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CreateAdminRoleDialog({
  open,
  selectableMembers,
  onOpenChange,
  onCreateAdminRole,
}: {
  open: boolean;
  selectableMembers: SelectableMemberDto[];
  onOpenChange: (open: boolean) => void;
  onCreateAdminRole: (dto: CreateAdminRoleInput) => void | Promise<void>;
}) {
  const { t } = useTranslation('admin');
  const [adminDraft, setAdminDraft] = useState<CreateAdminRoleInput>({ ...emptyAdminDraft });
  const close = () => {
    onOpenChange(false);
    setAdminDraft({ ...emptyAdminDraft });
  };
  const submitCreateAdminRole = async () => {
    const dto = { name: adminDraft.name.trim(), admin: adminDraft.admin, scope: adminDraft.scope?.trim() || undefined };
    if (!dto.name || !dto.admin) return;
    await onCreateAdminRole(dto);
    close();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) setAdminDraft({ ...emptyAdminDraft });
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('roles.dialog.addAdminTitle')}</DialogTitle>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel required>{t('roles.form.adminRoleName')}</FieldLabel>
            <Input
              placeholder={t('roles.form.adminRoleNamePlaceholder')}
              value={adminDraft.name}
              onChange={(event) => setAdminDraft((current) => ({ ...current, name: event.target.value }))}
            />
          </Field>
          <Field>
            <FieldLabel required>{t('roles.form.adminMember')}</FieldLabel>
            <NativeSelect
              aria-label={t('roles.form.adminMember')}
              value={adminDraft.admin}
              onChange={(event) => setAdminDraft((current) => ({ ...current, admin: event.target.value }))}
            >
              <option value="">{t('roles.form.adminMemberPlaceholder')}</option>
              {selectableMembers.map((member) => (
                <option key={member.id} value={member.name}>
                  {member.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={close}>
            {t('roles.actions.cancel')}
          </Button>
          <Button onClick={submitCreateAdminRole} disabled={!adminDraft.name.trim() || !adminDraft.admin}>
            {t('roles.actions.confirmCreate')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
