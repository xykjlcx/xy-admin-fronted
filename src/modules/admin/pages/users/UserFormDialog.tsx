import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FormDialogContent } from '@/components/pro/FormDialog';
import { Dialog } from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SelectControl } from '@/components/ui/select';
import type { CreateUserInput, DeptDto, UserDto } from '@/modules/admin/api/user.api';
import { emptyDraft } from './model';

export function CreateUserDialog({
  open,
  depts,
  onOpenChange,
  onCreateUser,
}: {
  open: boolean;
  depts: DeptDto[];
  onOpenChange: (open: boolean) => void;
  onCreateUser: (dto: CreateUserInput) => void | Promise<void>;
}) {
  const { t } = useTranslation('admin');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <UserFormDialogContent
          key="create"
          depts={depts}
          onOpenChange={onOpenChange}
          initialDraft={{ ...emptyDraft }}
          title={t('users.dialog.createTitle')}
          onSubmit={onCreateUser}
        />
      )}
    </Dialog>
  );
}

export function EditUserDialog({
  user,
  depts,
  onOpenChange,
  onUpdateUser,
}: {
  user: UserDto | null;
  depts: DeptDto[];
  onOpenChange: (open: boolean) => void;
  onUpdateUser: (id: string, dto: CreateUserInput) => void | Promise<void>;
}) {
  const { t } = useTranslation('admin');
  const open = !!user;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {user && (
        <UserFormDialogContent
          key={`edit-${user.id}`}
          depts={depts}
          onOpenChange={onOpenChange}
          initialDraft={{
            name: user.name,
            deptId: user.deptId,
            role: user.role,
            phone: user.phone,
            email: user.email,
          }}
          title={t('users.dialog.editTitle')}
          onSubmit={(dto) => onUpdateUser(user.id, dto)}
        />
      )}
    </Dialog>
  );
}

function UserFormDialogContent({
  depts,
  title,
  initialDraft,
  onOpenChange,
  onSubmit,
}: {
  depts: DeptDto[];
  title: string;
  initialDraft: CreateUserInput;
  onOpenChange: (open: boolean) => void;
  onSubmit: (dto: CreateUserInput) => void | Promise<void>;
}) {
  const { t } = useTranslation('admin');
  const [draft, setDraft] = useState<CreateUserInput>(() => initialDraft);

  const submit = async () => {
    const dto = { ...draft, deptId: draft.deptId || depts[0]?.id || '' };
    await onSubmit(dto);
    onOpenChange(false);
  };

  return (
    <FormDialogContent
      title={title}
      cancelText={t('users.actions.cancel')}
      submitText={t('users.actions.save')}
      submitDisabled={!draft.name || !draft.role || !draft.phone || !draft.email}
      onCancel={() => onOpenChange(false)}
      onSubmit={submit}
    >
      <Field>
        <FieldLabel htmlFor="user-name">{t('users.form.name')}</FieldLabel>
        <Input
          id="user-name"
          placeholder={t('users.form.name')}
          value={draft.name}
          onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="user-dept">{t('users.form.dept')}</FieldLabel>
        <SelectControl
          id="user-dept"
          value={draft.deptId}
          options={[
            { value: '', label: t('users.form.dept') },
            ...depts.map((dept) => ({ value: dept.id, label: dept.name })),
          ]}
          onValueChange={(deptId) => setDraft((current) => ({ ...current, deptId }))}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="user-role">{t('users.form.role')}</FieldLabel>
        <Input
          id="user-role"
          placeholder={t('users.form.role')}
          value={draft.role}
          onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value }))}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="user-phone">{t('users.form.phone')}</FieldLabel>
        <Input
          id="user-phone"
          placeholder={t('users.form.phone')}
          value={draft.phone}
          onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="user-email">{t('users.form.email')}</FieldLabel>
        <Input
          id="user-email"
          placeholder={t('users.form.email')}
          value={draft.email}
          onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))}
        />
      </Field>
    </FormDialogContent>
  );
}
