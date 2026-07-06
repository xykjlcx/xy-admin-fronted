import { useCallback, useState, type JSX } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { OnChangeFn, RowSelectionState } from '@tanstack/react-table';
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
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const canCreate = matchPermission(permissions, 'iam:user:create');
  const writable = variant === 'members';

  const clearRowSelection = useCallback(() => setRowSelection({}), []);
  // search（页码/筛选/部门）变化时清空行选择——用「渲染期同步 setState」而非整场景 remount，
  // 防跨页/跨筛选选择错乱，同时避免翻页重挂场景与 DeptTree 滚动丢失（诊断 F9）。
  const searchKey = `${search.page}:${search.pageSize}:${search.status}:${search.keyword ?? ''}:${search.deptId ?? ''}`;
  const [prevSearchKey, setPrevSearchKey] = useState(searchKey);
  if (searchKey !== prevSearchKey) {
    setPrevSearchKey(searchKey);
    setRowSelection({});
  }
  const handleRowSelectionChange = useCallback<OnChangeFn<RowSelectionState>>((updater) => {
    setRowSelection((current) => (typeof updater === 'function' ? updater(current) : updater));
  }, []);
  const handleSearchChange = useCallback(
    (patch: Partial<UsersQueryParams>) => {
      clearRowSelection();
      onSearchChange(patch);
    },
    [clearRowSelection, onSearchChange],
  );

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
          onSelect={(deptId) => handleSearchChange({ deptId, page: 1 })}
        />

        <main className="flex min-w-0 flex-1 flex-col px-6 py-[calc(18px*var(--app-scale))]">
          <MembersTable
            variant={variant}
            permissions={permissions}
            search={search}
            onSearchChange={handleSearchChange}
            rowSelection={rowSelection}
            onRowSelectionChange={handleRowSelectionChange}
            onClearSelection={clearRowSelection}
            toolbar={
              <UsersToolbar
                variant={variant}
                search={search}
                canCreate={canCreate}
                onSearchChange={handleSearchChange}
                onCreate={writable ? () => setFormState({ kind: 'create' }) : undefined}
              />
            }
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
