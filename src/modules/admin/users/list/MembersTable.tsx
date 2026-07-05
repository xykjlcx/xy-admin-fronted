import { useMemo, useState, type JSX } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { DataTable } from '@/components/pro/DataTable';
import { Button } from '@/components/ui/button';
import { matchPermission } from '@/lib/permission';
import { deptsQuery, usersQuery, type UserDto, type UsersQueryParams } from '../api';
import { userColumns } from './columns';
import type { MembersVariant, UsersSearch } from '../types';

interface MembersTableProps {
  variant: MembersVariant;
  permissions: string[];
  search: UsersSearch;
  onSearchChange: (patch: Partial<UsersQueryParams>) => void;
  onView?: (user: UserDto) => void;
  onEdit?: (user: UserDto) => void;
  onDelete?: (user: UserDto) => void;
  onBatchDisable?: (ids: string[]) => void | Promise<void>;
}

const emptyUsersPage = { list: [], total: 0 };

export function MembersTable({
  variant,
  permissions,
  search,
  onSearchChange,
  onView,
  onEdit,
  onDelete,
  onBatchDisable,
}: MembersTableProps): JSX.Element {
  const { t } = useTranslation('admin');
  const [bulkResetVersion, setBulkResetVersion] = useState(0);
  const effectiveSearch: UsersQueryParams = {
    ...search,
    status: variant === 'left' ? 'left' : search.status === 'left' ? 'all' : search.status,
  };
  const usersResult = useQuery(usersQuery(effectiveSearch));
  const { data: depts = [] } = useQuery(deptsQuery);
  const usersPage = usersResult.data ?? emptyUsersPage;
  const pageCount = Math.max(1, Math.ceil(usersPage.total / search.pageSize));
  const deptById = useMemo(() => new Map(depts.map((dept) => [dept.id, dept])), [depts]);
  const selectedDeptLabel = search.deptId ? deptById.get(search.deptId)?.name : t('users.allMembers');
  const canDisable = !!onBatchDisable && matchPermission(permissions, 'iam:user:resign');
  const currentPageIds = usersPage.list.map((user) => user.id).join(',');
  const resetSelectionKey = [
    variant,
    effectiveSearch.status,
    effectiveSearch.deptId ?? '',
    effectiveSearch.directOnly ? 'direct' : 'all',
    effectiveSearch.keyword ?? '',
    effectiveSearch.page,
    effectiveSearch.pageSize,
    currentPageIds,
    bulkResetVersion,
  ].join('|');

  const handleBatchDisable = async (ids: string[]) => {
    if (!onBatchDisable) return;
    await onBatchDisable(ids);
    setBulkResetVersion((version) => version + 1);
  };

  return (
    <>
      <div className="mb-4 flex items-center">
        <span className="text-base font-bold">{selectedDeptLabel}</span>
        <span className="ml-3 text-[calc(13px*var(--app-scale))] text-text-3">
          {t('users.countPeople', { count: usersPage.total })}
        </span>
      </div>

      <DataTable
        columns={userColumns({ t, permissions, deptById, onView, onEdit, onDelete })}
        data={usersPage.list}
        rowKey={(user) => user.id}
        loading={usersResult.isPending}
        emptyText={t('users.empty')}
        loadingText={t('users.loading')}
        resetSelectionKey={resetSelectionKey}
        selection={{
          enabled: variant === 'members',
          renderBulkBar: (selectedVisibleIds) =>
            canDisable ? (
              <div className="mt-4 flex items-center justify-between rounded-8 bg-(--table-row-bg-selected) px-3.5 py-2.5">
                <span className="text-[calc(13px*var(--app-scale))] text-text-2">
                  {t('users.selectedCount', { count: selectedVisibleIds.length })}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void handleBatchDisable(selectedVisibleIds);
                  }}
                >
                  {t('users.actions.batchDisable')}
                </Button>
              </div>
            ) : null,
        }}
        pagination={{
          page: search.page,
          pageCount,
          total: usersPage.total,
          refreshing: usersResult.isFetching && !usersResult.isPending,
          totalLabel: t('users.countMembers', { count: usersPage.total }),
          refreshingLabel: t('users.refreshing'),
          prevLabel: t('users.pagination.prev'),
          nextLabel: t('users.pagination.next'),
          currentLabel: t('users.pagination.current', { page: search.page }),
          onPageChange: (page) => onSearchChange({ page }),
        }}
      />
    </>
  );
}
