import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
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
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <div className="grid gap-3">
        <Input
          placeholder={t('users.form.name')}
          value={draft.name}
          onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
        />
        <select
          className="h-9 rounded-md border border-border bg-surface px-3 text-sm outline-none"
          value={draft.deptId}
          onChange={(event) => setDraft((current) => ({ ...current, deptId: event.target.value }))}
        >
          <option value="">{t('users.form.dept')}</option>
          {depts.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.name}
            </option>
          ))}
        </select>
        <Input
          placeholder={t('users.form.role')}
          value={draft.role}
          onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value }))}
        />
        <Input
          placeholder={t('users.form.phone')}
          value={draft.phone}
          onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))}
        />
        <Input
          placeholder={t('users.form.email')}
          value={draft.email}
          onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))}
        />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          {t('users.actions.cancel')}
        </Button>
        <Button onClick={submit} disabled={!draft.name || !draft.role || !draft.phone || !draft.email}>
          {t('users.actions.save')}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
