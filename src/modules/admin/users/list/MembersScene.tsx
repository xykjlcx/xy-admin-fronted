import { useState, type JSX } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@/components/pro/ConfirmDialog';
import { matchPermission } from '@/lib/permission';
import { UserDetailPage } from '../detail/UserDetailPage';
import { UserFormDialog } from '../form/UserFormDialog';
import { UsersToolbar } from './UsersToolbar';
import { DeptTree } from './DeptTree';
import { MembersTable } from './MembersTable';
import { deptsQuery, useUserMutations, type UserDto } from '../api';
import type { MembersVariant, UserFormState, UsersSearch } from '../types';
import type { UsersQueryParams } from '../api';

interface MembersSceneProps {
  variant: MembersVariant;
  permissions: string[];
  search: UsersSearch;
  onSearchChange: (patch: Partial<UsersQueryParams>) => void;
}

export function MembersScene({
  variant,
  permissions,
  search,
  onSearchChange,
}: MembersSceneProps): JSX.Element {
  const { t } = useTranslation('admin');
  const { data: depts = [] } = useQuery(deptsQuery);
  const mutations = useUserMutations();
  const [formState, setFormState] = useState<UserFormState>({ kind: 'closed' });
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserDto | null>(null);
  const canCreate = matchPermission(permissions, 'iam:user:create');
  const writable = variant === 'members';

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await mutations.deleteUser.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <>
      <div className="flex min-h-0 flex-1">
        <DeptTree
          selectedId={search.deptId}
          onSelect={(deptId) => onSearchChange({ deptId, page: 1 })}
        />

        <main className="flex min-w-0 flex-1 flex-col px-6 py-[calc(18px*var(--app-scale))]">
          <UsersToolbar
            variant={variant}
            search={search}
            canCreate={canCreate}
            onSearchChange={onSearchChange}
            onCreate={writable ? () => setFormState({ kind: 'create' }) : undefined}
          />
          <MembersTable
            variant={variant}
            permissions={permissions}
            search={search}
            onSearchChange={onSearchChange}
            onView={(user) => setDetailUserId(user.id)}
            onEdit={writable ? (user) => setFormState({ kind: 'edit', user }) : undefined}
            onDelete={writable ? setDeleteTarget : undefined}
            onBatchDisable={
              writable
                ? async (ids) => {
                    await mutations.batchDisable.mutateAsync(ids);
                  }
                : undefined
            }
          />
        </main>
      </div>

      <UserFormDialog
        state={formState}
        depts={depts}
        onOpenChange={(open) => !open && setFormState({ kind: 'closed' })}
        onCreateUser={async (dto) => {
          await mutations.createUser.mutateAsync(dto);
          setFormState({ kind: 'closed' });
        }}
        onUpdateUser={async (id, dto) => {
          await mutations.updateUser.mutateAsync({ id, dto });
          setFormState({ kind: 'closed' });
        }}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        title={t('users.dialog.deleteTitle')}
        description={t('users.dialog.deleteDesc')}
        cancelText={t('users.actions.cancel')}
        confirmText={t('users.actions.confirmDelete')}
        pending={mutations.deleteUser.isPending}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
      <UserDetailPage userId={detailUserId} onClose={() => setDetailUserId(null)} />
    </>
  );
}
