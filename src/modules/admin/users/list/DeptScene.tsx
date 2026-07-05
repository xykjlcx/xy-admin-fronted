import { useMemo, type JSX } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Folder } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DataTable, type DataTableColumn } from '@/components/pro/DataTable';
import { deptsQuery, type DeptDto } from '../api';
import { buildDepthMap, deptIndentClass } from '../model';

export function DeptScene(): JSX.Element {
  const { t } = useTranslation('admin');
  const { data: depts = [], isPending } = useQuery(deptsQuery);
  const depthMap = useMemo(() => buildDepthMap(depts), [depts]);
  const columns = [
    {
      key: 'dept',
      header: t('users.columns.dept'),
      width: '80%',
      cell: (dept) => (
        <div className={`flex min-w-0 items-center gap-2 ${deptIndentClass(depthMap.get(dept.id) ?? 0)}`}>
          <Folder className="size-4 shrink-0 text-text-3" />
          <span className="truncate text-sm text-text">{dept.name}</span>
        </div>
      ),
    },
    {
      key: 'memberCount',
      header: t('users.columns.memberCount'),
      width: 'calc(120px * var(--app-scale))',
      cell: (dept) => (
        <span className="text-[calc(13px*var(--app-scale))] text-text-2">
          {t('users.memberCount', { count: dept.memberCount })}
        </span>
      ),
    },
  ] satisfies DataTableColumn<DeptDto>[];

  return (
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
  );
}
