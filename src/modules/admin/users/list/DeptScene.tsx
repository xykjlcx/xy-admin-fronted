import { useMemo, type JSX } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Folder } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DataTable } from '@/components/pro/DataTable';
import { deptsQuery, type DeptDto, type UsersQueryParams } from '../api';
import { buildDepthMap, deptIndentClass } from '../model';
import { DeptTree } from './DeptTree';
import type { UsersSearch } from '../types';

export function DeptScene({
  search,
  onSearchChange,
}: {
  search: UsersSearch;
  onSearchChange: (patch: Partial<UsersQueryParams>) => void;
}): JSX.Element {
  const { t } = useTranslation('admin');
  const { data: depts = [], isPending } = useQuery(deptsQuery);
  const depthMap = useMemo(() => buildDepthMap(depts), [depts]);
  const columns: ColumnDef<DeptDto>[] = [
    {
      id: 'dept',
      header: t('users.columns.dept'),
      meta: { width: '80%' },
      enableSorting: false,
      cell: ({ row }) => {
        const dept = row.original;

        return (
          <div className={`flex min-w-0 items-center gap-2 ${deptIndentClass(depthMap.get(dept.id) ?? 0)}`}>
            <Folder className="size-4 shrink-0 text-text-3" />
            <span className="truncate text-sm text-text">{dept.name}</span>
          </div>
        );
      },
    },
    {
      id: 'memberCount',
      header: t('users.columns.memberCount'),
      meta: { width: 'calc(120px * var(--app-scale))' },
      enableSorting: false,
      cell: ({ row }) => {
        const dept = row.original;

        return (
          <span className="text-[calc(13px*var(--app-scale))] text-text-2">
            {t('users.memberCount', { count: dept.memberCount })}
          </span>
        );
      },
    },
  ];

  return (
    <div className="flex min-h-0 flex-1">
      <DeptTree
        selectedId={search.deptId}
        onSelect={(deptId) => onSearchChange({ deptId, page: 1 })}
      />
      <main className="flex min-w-0 flex-1 flex-col px-6 py-[calc(18px*var(--app-scale))]">
        <div className="mb-4 flex items-center">
          <span className="text-base font-bold">{t('users.deptList.title')}</span>
          <span className="ml-3 text-[calc(13px*var(--app-scale))] text-text-3">
            {t('users.deptList.subtitle')}
          </span>
        </div>
        <DataTable
          columns={columns}
          data={depts}
          rowKey={(dept) => dept.id}
          loading={isPending}
          emptyText={t('users.deptList.empty')}
          loadingText={t('users.deptList.loading')}
        />
      </main>
    </div>
  );
}
