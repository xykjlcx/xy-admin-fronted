import { useMemo, useState } from 'react';
import { MoreHorizontal, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { StatusBadge } from '@/components/pro/StatusBadge';
import {
  TableCheckbox,
  TableShell,
  TableShellHeader,
  TableShellLoadingRows,
  TableShellRow,
} from '@/components/pro/TableShell';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { DeptDto, PageResult, UserDto, UsersQueryParams } from '@/modules/admin/api/user.api';
import {
  avatarClasses,
  initials,
  memberGridTemplate,
  statusOptions,
  statusTone,
} from './model';
import type { TabKey } from './types';

interface SelectionState {
  scope: string;
  ids: string[];
}

export function MembersPanel({
  activeTab,
  selectedDeptLabel,
  usersPage,
  usersLoading,
  usersRefreshing,
  search,
  deptById,
  canCreate,
  canUpdate,
  canDelete,
  canDisable,
  onSearchChange,
  onCreateUser,
  onEditUser,
  onDeleteUser,
  onViewUser,
  onBatchDisable,
}: {
  activeTab: TabKey;
  selectedDeptLabel: string | undefined;
  usersPage: PageResult<UserDto>;
  usersLoading: boolean;
  usersRefreshing: boolean;
  search: UsersQueryParams;
  deptById: Map<string, DeptDto>;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canDisable: boolean;
  onSearchChange: (patch: Partial<UsersQueryParams>) => void;
  onCreateUser: () => void;
  onEditUser: (user: UserDto) => void;
  onDeleteUser: (user: UserDto) => void;
  onViewUser: (user: UserDto) => void;
  onBatchDisable: (ids: string[]) => void | Promise<void>;
}) {
  const { t } = useTranslation('admin');
  const [statusOpen, setStatusOpen] = useState(false);
  const pageCount = Math.max(1, Math.ceil(usersPage.total / search.pageSize));
  const allPageIds = useMemo(() => usersPage.list.map((user) => user.id), [usersPage.list]);
  const selectionScope = [
    activeTab,
    search.status,
    search.deptId ?? '',
    search.directOnly ? 'direct' : 'all',
    allPageIds.join(','),
  ].join('|');
  const [selectionState, setSelectionState] = useState<SelectionState>(() => ({ scope: selectionScope, ids: [] }));
  const selectedIds = useMemo(
    () => (selectionState.scope === selectionScope ? selectionState.ids : []),
    [selectionScope, selectionState.ids, selectionState.scope],
  );
  const allPageIdSet = useMemo(() => new Set(allPageIds), [allPageIds]);
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedVisibleIds = selectedIds.filter((id) => allPageIdSet.has(id));
  const allSelected = allPageIds.length > 0 && allPageIds.every((id) => selectedIdSet.has(id));

  const updateSelectedIds = (updater: (current: string[]) => string[]) => {
    setSelectionState((current) => {
      const scopedIds = current.scope === selectionScope ? current.ids : [];
      return { scope: selectionScope, ids: updater(scopedIds) };
    });
  };
  const patchSearch = (patch: Partial<UsersQueryParams>) => {
    setSelectionState({ scope: selectionScope, ids: [] });
    onSearchChange(patch);
  };
  const toggleRow = (id: string) => {
    updateSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };
  const togglePage = () => {
    updateSelectedIds((current) =>
      allSelected
        ? current.filter((id) => !allPageIds.includes(id))
        : [...new Set([...current, ...allPageIds])],
    );
  };
  const batchDisable = async () => {
    await onBatchDisable(selectedVisibleIds);
    setSelectionState({ scope: selectionScope, ids: [] });
  };

  return (
    <>
      <div className="mb-4 flex items-center">
        <span className="text-base font-bold">{selectedDeptLabel}</span>
        <span className="ml-3 text-[calc(13px*var(--app-scale))] text-text-3">
          {t('users.countPeople', { count: usersPage.total })}
        </span>
      </div>

      <div className="mb-4 flex items-center gap-3">
        {activeTab === 'members' && (
          <>
            <div className="relative">
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={statusOpen}
                className="flex h-[calc(34px*var(--app-scale))] items-center gap-2 rounded-8 border border-border px-3 text-[calc(13px*var(--app-scale))] text-text-2 hover:border-pri"
                onClick={() => setStatusOpen((open) => !open)}
              >
                <span className="text-text-3">{t('users.filters.accountStatus')}</span>
                <span className="font-medium text-text">{t(`users.status.${search.status}`)}</span>
                <span className="text-text-3">⌄</span>
              </button>
              {statusOpen && (
                <div
                  role="menu"
                  className="absolute left-0 top-10 z-30 w-[calc(140px*var(--app-scale))] rounded-10 border border-border bg-surface p-1.5 shadow-popover"
                >
                  {statusOptions.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      role="menuitemradio"
                      aria-checked={search.status === item.value}
                      className="flex h-[calc(34px*var(--app-scale))] w-full items-center rounded-6 px-2.5 text-left text-[calc(13px*var(--app-scale))] text-text-2 hover:bg-bg"
                      onClick={() => {
                        setStatusOpen(false);
                        patchSearch({ status: item.value, page: 1 });
                      }}
                    >
                      {t(`users.status.${item.value}`)}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              aria-pressed={!!search.directOnly}
              disabled={!search.deptId}
              className={cn(
                'flex h-[calc(34px*var(--app-scale))] items-center rounded-8 border px-3 text-[calc(13px*var(--app-scale))] hover:border-pri disabled:cursor-not-allowed disabled:opacity-50',
                search.directOnly ? 'border-pri bg-pri-soft text-pri' : 'border-border text-text-2',
              )}
              onClick={() => patchSearch({ directOnly: !search.directOnly, page: 1 })}
            >
              {t('users.filters.directOnly')}
            </button>
          </>
        )}
        <div className="flex-1" />
        {canCreate && activeTab === 'members' && (
          <button
            type="button"
            className="flex h-[calc(34px*var(--app-scale))] items-center gap-1.5 rounded-8 bg-pri px-4 text-[calc(13px*var(--app-scale))] text-white hover:bg-pri-hover"
            onClick={onCreateUser}
          >
            <Plus className="size-3.5" />
            {t('users.actions.create')}
          </button>
        )}
      </div>

      <TableShell
        header={
          <TableShellHeader gridTemplateColumns={memberGridTemplate}>
            <div className="flex justify-center">
              <TableCheckbox
                ariaLabel={t('users.selectPage')}
                checked={allSelected}
                onCheckedChange={togglePage}
              />
            </div>
            <div>{t('users.columns.name')}</div>
            <div>{t('users.columns.status')}</div>
            <div>{t('users.columns.phone')}</div>
            <div>{t('users.columns.dept')}</div>
            <div>{t('users.columns.actions')}</div>
          </TableShellHeader>
        }
        empty={usersLoading ? t('users.loading') : t('users.empty')}
        selectedBar={
          selectedVisibleIds.length > 0 && canDisable ? (
            <div className="mt-4 flex items-center justify-between rounded-8 bg-pri-soft px-3.5 py-2.5">
              <span className="text-[calc(13px*var(--app-scale))] text-text-2">
                {t('users.selectedCount', { count: selectedVisibleIds.length })}
              </span>
              <Button size="sm" variant="outline" onClick={batchDisable}>
                {t('users.actions.batchDisable')}
              </Button>
            </div>
          ) : null
        }
        pagination={
          <div className="mt-4 flex items-center justify-between">
            <span className="text-[calc(13px*var(--app-scale))] text-text-3">
              {t('users.countMembers', { count: usersPage.total })}
              {usersRefreshing && <span className="ml-3 text-pri">{t('users.refreshing')}</span>}
            </span>
            <div className="flex items-center gap-2 text-[calc(13px*var(--app-scale))] text-text-2">
              <button
                className="flex size-[calc(30px*var(--app-scale))] items-center justify-center rounded-7 border border-border"
                aria-label={t('users.pagination.prev')}
                disabled={search.page <= 1}
                onClick={() => patchSearch({ page: search.page - 1 })}
              >
                ‹
              </button>
              <button
                className="flex size-[calc(30px*var(--app-scale))] items-center justify-center rounded-7 border border-pri text-pri"
                aria-label={t('users.pagination.current', { page: search.page })}
                aria-current="page"
              >
                {search.page}
              </button>
              <button
                className="flex size-[calc(30px*var(--app-scale))] items-center justify-center rounded-7 border border-border"
                aria-label={t('users.pagination.next')}
                disabled={search.page >= pageCount}
                onClick={() => patchSearch({ page: search.page + 1 })}
              >
                ›
              </button>
            </div>
          </div>
        }
      >
        {usersLoading ? (
          <TableShellLoadingRows
            ariaLabel={t('users.loading')}
            gridTemplateColumns={memberGridTemplate}
            rows={6}
            cells={6}
          />
        ) : usersPage.list.length > 0 ? (
          usersPage.list.map((user, index) => (
              <TableShellRow
                key={user.id}
                gridTemplateColumns={memberGridTemplate}
                className={cn(selectedIdSet.has(user.id) && 'bg-pri-soft')}
              >
                <div className="flex justify-center">
                  <TableCheckbox
                    ariaLabel={t('users.selectUser', { name: user.name })}
                    checked={selectedIdSet.has(user.id)}
                    onCheckedChange={() => toggleRow(user.id)}
                  />
                </div>
                <div className="flex min-w-0 items-center gap-2.5">
                  <div
                    className={cn(
                      'flex size-[calc(30px*var(--app-scale))] shrink-0 items-center justify-center rounded-full text-[calc(13px*var(--app-scale))] font-semibold text-white',
                      avatarClasses[index % avatarClasses.length],
                    )}
                  >
                    {initials(user.name)}
                  </div>
                  <span className="truncate text-sm text-text">{user.name}</span>
                </div>
                <div>
                  <StatusBadge tone={statusTone(user.status)}>{t(`users.status.${user.status}`)}</StatusBadge>
                </div>
                <div className="truncate text-[calc(13px*var(--app-scale))] text-text-2">{user.phone}</div>
                <div className="truncate text-[calc(13px*var(--app-scale))] text-text-2">
                  {deptById.get(user.deptId)?.name ?? '-'}
                </div>
                <div className="flex items-center gap-3.5 text-[calc(13px*var(--app-scale))]">
                  <button type="button" className="text-pri" onClick={() => onViewUser(user)}>
                    {t('users.actions.detail')}
                  </button>
                  {canUpdate && (
                    <button type="button" className="text-pri" onClick={() => onEditUser(user)}>
                      {t('users.actions.edit')}
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      className="font-bold leading-none text-text-3"
                      onClick={() => onDeleteUser(user)}
                    >
                      <MoreHorizontal className="size-4" />
                      <span className="sr-only">{t('users.actions.deleteName', { name: user.name })}</span>
                    </button>
                  )}
                </div>
              </TableShellRow>
            ))
        ) : null}
      </TableShell>
    </>
  );
}
