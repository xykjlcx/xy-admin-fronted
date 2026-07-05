import { useMemo, useState } from 'react';
import { MoreHorizontal, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FilterSelect } from '@/components/pro/FilterSelect';
import { Pagination } from '@/components/pro/Pagination';
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

const filterControlClassName = [
  'border-(--field-border) bg-(--field-bg) text-text-2 shadow-none',
  'hover:border-(--field-border-hover) hover:bg-(--field-bg) hover:text-text',
  'data-[state=open]:border-(--field-border-hover) data-[state=open]:bg-(--field-bg-focus) data-[state=open]:text-text',
  'disabled:border-(--field-border) disabled:bg-(--field-bg-disabled) disabled:text-text-3',
].join(' ');

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
  const statusFilterOptions = statusOptions.map((item) => ({
    value: item.value,
    label: t(`users.status.${item.value}`),
  }));

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
            <FilterSelect
              label={t('users.filters.accountStatus')}
              value={search.status}
              options={statusFilterOptions}
              triggerClassName={filterControlClassName}
              onValueChange={(status) => patchSearch({ status, page: 1 })}
            />
            <Button
              data-role-filter-control="toggle"
              data-state={search.directOnly ? 'open' : 'closed'}
              type="button"
              variant="ghost"
              size="sm"
              className={filterControlClassName}
              aria-pressed={!!search.directOnly}
              disabled={!search.deptId}
              onClick={() => patchSearch({ directOnly: !search.directOnly, page: 1 })}
            >
              {t('users.filters.directOnly')}
            </Button>
          </>
        )}
        <div className="flex-1" />
        {canCreate && activeTab === 'members' && (
          <Button
            type="button"
            size="sm"
            onClick={onCreateUser}
          >
            <Plus data-icon="inline-start" />
            {t('users.actions.create')}
          </Button>
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
            <div className="mt-4 flex items-center justify-between rounded-8 bg-(--table-row-bg-selected) px-3.5 py-2.5">
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
          <Pagination
            page={search.page}
            pageCount={pageCount}
            totalLabel={t('users.countMembers', { count: usersPage.total })}
            refreshingLabel={usersRefreshing ? t('users.refreshing') : undefined}
            prevLabel={t('users.pagination.prev')}
            nextLabel={t('users.pagination.next')}
            currentLabel={t('users.pagination.current', { page: search.page })}
            onPageChange={(page) => patchSearch({ page })}
          />
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
                data-state={selectedIdSet.has(user.id) ? 'selected' : undefined}
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
                  <Button type="button" variant="link" size="xs" onClick={() => onViewUser(user)}>
                    {t('users.actions.detail')}
                  </Button>
                  {canUpdate && (
                    <Button type="button" variant="link" size="xs" onClick={() => onEditUser(user)}>
                      {t('users.actions.edit')}
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => onDeleteUser(user)}
                    >
                      <MoreHorizontal />
                      <span className="sr-only">{t('users.actions.deleteName', { name: user.name })}</span>
                    </Button>
                  )}
                </div>
              </TableShellRow>
            ))
        ) : null}
      </TableShell>
    </>
  );
}
