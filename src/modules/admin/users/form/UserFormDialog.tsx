import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { FormDialogContent } from '@/components/pro/FormDialog';
import { Dialog } from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SelectControl } from '@/components/ui/select';
import { useUserForm } from './useUserForm';
import type { CreateUserInput, DeptDto } from '../api';
import type { UserFormState } from '../types';

interface UserFormDialogProps {
  state: UserFormState;
  depts: DeptDto[];
  onOpenChange: (open: boolean) => void;
  onCreateUser: (dto: CreateUserInput) => void | Promise<void>;
  onUpdateUser: (id: string, dto: CreateUserInput) => void | Promise<void>;
}

export function UserFormDialog({
  state,
  depts,
  onOpenChange,
  onCreateUser,
  onUpdateUser,
}: UserFormDialogProps) {
  const { t } = useTranslation('admin');
  const open = state.kind !== 'closed';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <UserFormDialogContent
          key={state.kind === 'edit' ? `edit-${state.user.id}` : 'create'}
          state={state}
          depts={depts}
          title={state.kind === 'edit' ? t('users.dialog.editTitle') : t('users.dialog.createTitle')}
          onOpenChange={onOpenChange}
          onCreateUser={onCreateUser}
          onUpdateUser={onUpdateUser}
        />
      )}
    </Dialog>
  );
}

function UserFormDialogContent({
  state,
  depts,
  title,
  onOpenChange,
  onCreateUser,
  onUpdateUser,
}: UserFormDialogProps & { title: string }) {
  const { t } = useTranslation('admin');
  const form = useUserForm({ user: state.kind === 'edit' ? state.user : null, depts });
  const { control, formState, handleSubmit, register } = form;
  const submit = handleSubmit(async (dto) => {
    if (state.kind === 'edit') {
      await onUpdateUser(state.user.id, dto);
    } else {
      await onCreateUser(dto);
    }
    onOpenChange(false);
  });

  return (
    <FormDialogContent
      title={title}
      cancelText={t('users.actions.cancel')}
      submitText={t('users.actions.save')}
      submitDisabled={!formState.isValid}
      onCancel={() => onOpenChange(false)}
      onSubmit={() => {
        void submit();
      }}
    >
      <Field>
        <FieldLabel htmlFor="user-name">{t('users.form.name')}</FieldLabel>
        <Input
          id="user-name"
          placeholder={t('users.form.name')}
          aria-invalid={!!formState.errors.name}
          {...register('name')}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="user-dept">{t('users.form.dept')}</FieldLabel>
        <Controller
          name="deptId"
          control={control}
          render={({ field }) => (
            <SelectControl
              id="user-dept"
              value={field.value}
              options={depts.map((dept) => ({ value: dept.id, label: dept.name }))}
              placeholder={t('users.form.dept')}
              aria-invalid={!!formState.errors.deptId}
              onValueChange={field.onChange}
            />
          )}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="user-role">{t('users.form.role')}</FieldLabel>
        <Input
          id="user-role"
          placeholder={t('users.form.role')}
          aria-invalid={!!formState.errors.role}
          {...register('role')}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="user-phone">{t('users.form.phone')}</FieldLabel>
        <Input
          id="user-phone"
          placeholder={t('users.form.phone')}
          aria-invalid={!!formState.errors.phone}
          {...register('phone')}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="user-email">{t('users.form.email')}</FieldLabel>
        <Input
          id="user-email"
          placeholder={t('users.form.email')}
          aria-invalid={!!formState.errors.email}
          {...register('email')}
        />
      </Field>
    </FormDialogContent>
  );
}
