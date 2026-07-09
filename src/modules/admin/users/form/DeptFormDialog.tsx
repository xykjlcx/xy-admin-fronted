import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { FormDialogContent } from '@/components/pro/FormDialog';
import { Dialog } from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SelectControl } from '@/components/ui/select';
import { useDeptForm } from './useDeptForm';
import type { CreateDeptInput, DeptDto, UpdateDeptInput } from '../api';
import type { DeptFormState } from '../types';

interface DeptFormDialogProps {
  state: DeptFormState;
  depts: DeptDto[];
  onOpenChange: (open: boolean) => void;
  onCreateDept: (dto: CreateDeptInput) => void | Promise<void>;
  onUpdateDept: (id: string, dto: UpdateDeptInput) => void | Promise<void>;
}

export function DeptFormDialog({
  state,
  depts,
  onOpenChange,
  onCreateDept,
  onUpdateDept,
}: DeptFormDialogProps) {
  const { t } = useTranslation('admin');
  const open = state.kind !== 'closed';
  const title =
    state.kind === 'edit'
      ? t('users.dialog.editDeptTitle')
      : state.kind === 'createChild'
        ? t('users.dialog.createChildDeptTitle')
        : t('users.dialog.createDeptTitle');
  const dialogKey =
    state.kind === 'edit'
      ? `edit-${state.dept.id}`
      : state.kind === 'createChild'
        ? `child-${state.parent.id}`
        : 'create';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <DeptFormDialogContent
          key={dialogKey}
          state={state}
          depts={depts}
          title={title}
          onOpenChange={onOpenChange}
          onCreateDept={onCreateDept}
          onUpdateDept={onUpdateDept}
        />
      )}
    </Dialog>
  );
}

function DeptFormDialogContent({
  state,
  depts,
  title,
  onOpenChange,
  onCreateDept,
  onUpdateDept,
}: DeptFormDialogProps & { title: string }) {
  const { t } = useTranslation('admin');
  const form = useDeptForm({ state });
  const { control, formState, handleSubmit, register } = form;
  const parentOptions = [
    { value: '', label: t('users.deptList.root') },
    ...depts.map((dept) => ({ value: dept.id, label: dept.name })),
  ];
  const submit = handleSubmit(async (values) => {
    const dto: CreateDeptInput = {
      name: values.name,
      parentId: values.parentId || null,
    };

    if (state.kind === 'edit') {
      await onUpdateDept(state.dept.id, dto);
    } else {
      await onCreateDept(dto);
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
        <FieldLabel htmlFor="dept-name">{t('users.form.deptName')}</FieldLabel>
        <Input
          id="dept-name"
          placeholder={t('users.form.deptName')}
          aria-invalid={!!formState.errors.name}
          {...register('name')}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="dept-parent">{t('users.form.parentDept')}</FieldLabel>
        <Controller
          name="parentId"
          control={control}
          render={({ field }) => (
            <SelectControl
              id="dept-parent"
              value={field.value}
              options={parentOptions}
              placeholder={t('users.form.parentDept')}
              disabled={state.kind === 'createChild'}
              aria-invalid={!!formState.errors.parentId}
              onValueChange={field.onChange}
            />
          )}
        />
      </Field>
    </FormDialogContent>
  );
}
