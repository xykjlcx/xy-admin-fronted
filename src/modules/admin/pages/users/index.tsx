import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@/components/pro/ConfirmDialog';
import { matchPermission } from '@/lib/permission';
import { cn } from '@/lib/utils';
import {
  deptsQuery,
  userApi,
  usersQuery,
  type UpdateUserInput,
  type UserDto,
  type UsersQueryParams,
} from '@/modules/admin/api/user.api';
import { DeptListPanel } from './DeptListPanel';
import { DeptSidebar } from './DeptSidebar';
import { MembersPanel } from './MembersPanel';
import { UserDetailSheet } from './UserDetailSheet';
import { CreateUserDialog, EditUserDialog } from './UserFormDialog';
import { buildDepthMap } from './model';
import type { TabKey, UserFormState, UsersViewProps } from './types';

export type { UsersViewProps };

type UsersSearch = UsersQueryParams & { keyword: string };

interface UsersPageProps {
  permissions: string[];
  search: UsersSearch;
  onSearchChange: (patch: Partial<UsersQueryParams>) => void;
}

const emptyUsersPage = { list: [], total: 0 } satisfies NonNullable<UsersViewProps['usersPage']>;

// Page 组件处理数据请求、mutation 和缓存失效；View 组件只处理页面状态和布局。
// 这个分层是为了让后续新增/编辑/详情等子组件能独立演进，不把业务实现堆回路由文件。
export function UsersPage({ permissions, search, onSearchChange }: UsersPageProps) {
  const queryClient = useQueryClient();
  const { data: depts } = useSuspenseQuery(deptsQuery);
  const usersResult = useQuery(usersQuery(search));
  const invalidateUsers = () => queryClient.invalidateQueries({ queryKey: ['iam', 'users'] });
  const createUser = useMutation({ mutationFn: userApi.createUser, onSuccess: invalidateUsers });
  const updateUser = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateUserInput }) => userApi.updateUser(id, dto),
    onSuccess: invalidateUsers,
  });
  const deleteUser = useMutation({ mutationFn: userApi.deleteUser, onSuccess: invalidateUsers });
  const batchDisable = useMutation({ mutationFn: userApi.batchDisableUsers, onSuccess: invalidateUsers });

  return (
    <UsersView
      permissions={permissions}
      depts={depts}
      usersPage={usersResult.data}
      usersLoading={usersResult.isPending}
      usersRefreshing={usersResult.isFetching && !usersResult.isPending}
      search={search}
      onSearchChange={onSearchChange}
      onCreateUser={async (dto) => {
        await createUser.mutateAsync(dto);
      }}
      onUpdateUser={async (id, dto) => {
        await updateUser.mutateAsync({ id, dto });
      }}
      onDeleteUser={async (id) => {
        await deleteUser.mutateAsync(id);
      }}
      onBatchDisable={async (ids) => {
        await batchDisable.mutateAsync(ids);
      }}
    />
  );
}

export function UsersView({
  permissions,
  depts,
  usersPage,
  usersLoading = false,
  usersRefreshing = false,
  search,
  onSearchChange,
  onCreateUser,
  onUpdateUser,
  onDeleteUser,
  onBatchDisable,
}: UsersViewProps) {
  const { t } = useTranslation('admin');
  const [tab, setTab] = useState<TabKey>(search.status === 'left' ? 'left' : 'members');
  const [userFormState, setUserFormState] = useState<UserFormState>({ kind: 'closed' });
  const [deleteTarget, setDeleteTarget] = useState<UserDto | null>(null);
  const [detailUser, setDetailUser] = useState<UserDto | null>(null);
  const deptById = useMemo(() => new Map(depts.map((dept) => [dept.id, dept])), [depts]);
  const deptDepth = useMemo(() => buildDepthMap(depts), [depts]);
  const canCreate = matchPermission(permissions, 'iam:user:create');
  const canUpdate = matchPermission(permissions, 'iam:user:update');
  const canDelete = matchPermission(permissions, 'iam:user:del');
  const canDisable = matchPermission(permissions, 'iam:user:resign');
  const resolvedUsersPage = usersPage ?? emptyUsersPage;
  const selectedDeptLabel = search.deptId ? deptById.get(search.deptId)?.name : t('users.allMembers');
  const activeTab: TabKey = search.status === 'left' ? 'left' : tab;

  const patchSearch = (patch: Partial<UsersQueryParams>) => {
    onSearchChange(patch);
  };
  const switchTab = (next: TabKey) => {
    setTab(next);
    if (next === 'left') patchSearch({ status: 'left', page: 1 });
    if (next === 'members') patchSearch({ status: 'all', page: 1 });
    if (next === 'depts' && search.status === 'left') patchSearch({ status: 'all', page: 1 });
  };
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await onDeleteUser(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <section
      className="flex min-h-0 flex-col text-text"
      style={{ padding: 'calc(20px * var(--app-scale)) calc(28px * var(--app-scale))' }}
    >
      <div className="mb-4 flex items-center gap-2 text-[calc(13px*var(--app-scale))] text-text-3">
        <span>{t('users.breadcrumbGroup')}</span>
        <span>›</span>
        <span className="text-text">{t('users.title')}</span>
      </div>

      <div className="flex min-h-[calc(640px*var(--app-scale))] flex-col overflow-hidden rounded-12 border border-border bg-surface shadow-xs">
        <div className="flex items-end border-b border-border px-6 pt-[calc(18px*var(--app-scale))]" role="tablist">
          {[
            ['members', t('users.tabs.members')],
            ['depts', t('users.tabs.depts')],
            ['left', t('users.tabs.left')],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={activeTab === key}
              className={cn(
                'mr-7 border-b-2 px-1 pb-3 text-[calc(15px*var(--app-scale))]',
                activeTab === key ? 'border-pri font-semibold text-text' : 'border-transparent font-normal text-text-2',
              )}
              onClick={() => switchTab(key as TabKey)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex min-h-0 flex-1">
          <DeptSidebar
            depts={depts}
            depthMap={deptDepth}
            selectedDeptId={search.deptId}
            onSelectDept={(deptId) => patchSearch({ deptId, page: 1 })}
          />

          <main className="flex min-w-0 flex-1 flex-col px-6 py-[calc(18px*var(--app-scale))]">
            {activeTab === 'depts' ? (
              <DeptListPanel depts={depts} depthMap={deptDepth} />
            ) : (
              <MembersPanel
                activeTab={activeTab}
                selectedDeptLabel={selectedDeptLabel}
                usersPage={resolvedUsersPage}
                usersLoading={usersLoading}
                usersRefreshing={usersRefreshing}
                search={search}
                deptById={deptById}
                canCreate={canCreate}
                canUpdate={canUpdate}
                canDelete={canDelete}
                canDisable={canDisable}
                onSearchChange={onSearchChange}
                onCreateUser={() => setUserFormState({ kind: 'create' })}
                onEditUser={(user) => setUserFormState({ kind: 'edit', user })}
                onDeleteUser={setDeleteTarget}
                onViewUser={setDetailUser}
                onBatchDisable={onBatchDisable}
              />
            )}
          </main>
        </div>
      </div>

      <CreateUserDialog
        open={userFormState.kind === 'create'}
        depts={depts}
        onOpenChange={(open) => !open && setUserFormState({ kind: 'closed' })}
        onCreateUser={onCreateUser}
      />
      <EditUserDialog
        user={userFormState.kind === 'edit' ? userFormState.user : null}
        depts={depts}
        onOpenChange={(open) => !open && setUserFormState({ kind: 'closed' })}
        onUpdateUser={onUpdateUser}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        title={t('users.dialog.deleteTitle')}
        description={t('users.dialog.deleteDesc')}
        cancelText={t('users.actions.cancel')}
        confirmText={t('users.actions.confirmDelete')}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
      <UserDetailSheet
        user={detailUser}
        deptById={deptById}
        onOpenChange={(open) => !open && setDetailUser(null)}
      />
    </section>
  );
}
