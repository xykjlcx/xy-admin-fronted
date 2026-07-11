import { useCallback, useEffect, useMemo, useState, type JSX, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { OnChangeFn, RowSelectionState } from '@tanstack/react-table';
import { useTranslation } from 'react-i18next';
import { DataTable } from '@/components/pro/DataTable';
import { Button } from '@/components/ui/button';
import { SelectControl } from '@/components/ui/select';
import { matchPermission } from '@/lib/permission';
import { deptsQuery, usersQuery, type UserDto, type UsersQueryParams } from '../api';
import { userColumns } from './columns';
import type { MembersVariant, UsersSearch } from '../types';

interface MembersTableProps {
  variant: MembersVariant;
  permissions: string[];
  systemAdmin?: boolean;
  search: UsersSearch;
  onSearchChange: (patch: Partial<UsersQueryParams>) => void;
  rowSelection: RowSelectionState;
  onRowSelectionChange: OnChangeFn<RowSelectionState>;
  onClearSelection: () => void;
  onView?: (user: UserDto) => void;
  onEdit?: (user: UserDto) => void;
  onDelete?: (user: UserDto) => void;
  onBatchDisable?: (ids: string[]) => void | Promise<void>;
  onBatchEnable?: (ids: string[]) => void | Promise<void>;
  onBatchMove?: (ids: string[], deptId: string) => void | Promise<void>;
  toolbar?: ReactNode;
}

const emptyUsersPage = { list: [], total: 0 };

export function MembersTable({
  variant,
  permissions,
  systemAdmin = false,
  search,
  onSearchChange,
  rowSelection,
  onRowSelectionChange,
  onClearSelection,
  onView,
  onEdit,
  onDelete,
  onBatchDisable,
  onBatchEnable,
  onBatchMove,
  toolbar,
}: MembersTableProps): JSX.Element {
  const { t } = useTranslation('admin');
  const effectiveSearch: UsersQueryParams = {
    ...search,
    status: variant === 'left' ? 'left' : search.status === 'left' ? 'all' : search.status,
  };
  const usersResult = useQuery(usersQuery(effectiveSearch));
  const { data: depts = [] } = useQuery(deptsQuery);
  const usersPage = usersResult.data ?? emptyUsersPage;
  const pageCount = Math.max(1, Math.ceil(usersPage.total / search.pageSize));
  // 直接访问越界页码（总数>0 但当前页超出末页）时回正到最后一页，避免「有数据却空表」
  useEffect(() => {
    if (!usersResult.isPending && usersPage.total > 0 && search.page > pageCount) {
      onSearchChange({ page: pageCount });
    }
  }, [usersResult.isPending, usersPage.total, search.page, pageCount, onSearchChange]);
  const deptById = useMemo(() => new Map(depts.map((dept) => [dept.id, dept])), [depts]);
  let selectedDeptLabel = t('users.allMembers');
  if (variant === 'left') selectedDeptLabel = t('users.tabs.left');
  else if (search.deptId) selectedDeptLabel = deptById.get(search.deptId)?.name ?? selectedDeptLabel;
  const canDisable = !!onBatchDisable && matchPermission({ permissions, systemAdmin }, 'iam:user:resign');
  const canUpdate = matchPermission({ permissions, systemAdmin }, 'iam:user:update');
  const selectionEnabled = variant === 'members' && (canDisable || canUpdate);
  const [moveDeptId, setMoveDeptId] = useState('');
  const rowSelectAriaLabel = useCallback(
    (user: UserDto) => t('users.selectUser', { name: user.name }),
    [t],
  );

  const handleBatchDisable = async (ids: string[]) => {
    if (!onBatchDisable) return;
    await onBatchDisable(ids);
    onClearSelection();
  };

  const finishBatch = async (operation: () => void | Promise<void>) => {
    await operation();
    onClearSelection();
  };

  return (
    <>
      <div className="mb-4 flex items-center">
        <span className="text-base font-bold">{selectedDeptLabel}</span>
        <span className="ml-3 text-[calc(13px*var(--app-scale))] text-text-3">
          {t('users.countPeople', { count: usersPage.total })}
        </span>
      </div>
      {toolbar}

      <DataTable
        columns={userColumns({ t, permissions, systemAdmin, deptById, onView, onEdit, onDelete })}
        data={usersPage.list}
        rowKey={(user) => user.id}
        loading={usersResult.isPending}
        emptyText={t('users.empty')}
        loadingText={t('users.loading')}
        selection={{
          enabled: selectionEnabled,
          rowSelection,
          onRowSelectionChange,
          selectAllAriaLabel: t('users.selectPage'),
          rowSelectAriaLabel,
          renderBulkBar: (selectedVisibleIds) => (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-8 bg-(--table-row-bg-selected) px-3.5 py-2.5">
              <span className="text-[calc(13px*var(--app-scale))] text-text-2">
                {t('users.selectedCount', { count: selectedVisibleIds.length })}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {canUpdate && onBatchMove ? (
                  <SelectControl
                    size="sm"
                    value={moveDeptId}
                    aria-label={t('users.actions.batchMoveDept')}
                    placeholder={t('users.actions.batchMoveDept')}
                    options={depts.map((dept) => ({ value: dept.id, label: dept.name }))}
                    onValueChange={(deptId) => {
                      setMoveDeptId(deptId);
                      void finishBatch(() => onBatchMove(selectedVisibleIds, deptId));
                    }}
                  />
                ) : null}
                {canUpdate && onBatchEnable ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void finishBatch(() => onBatchEnable(selectedVisibleIds))}
                  >
                    {t('users.actions.batchEnable')}
                  </Button>
                ) : null}
                {canDisable ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      void handleBatchDisable(selectedVisibleIds);
                    }}
                  >
                    {t('users.actions.batchDisable')}
                  </Button>
                ) : null}
              </div>
            </div>
          ),
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
