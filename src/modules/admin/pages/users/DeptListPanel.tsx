import { Folder } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TableShell, TableShellHeader, TableShellRow, TableTreeCell } from '@/components/pro/TableShell';
import type { DeptDto } from '@/modules/admin/api/user.api';
import { deptGridTemplate } from './model';

export function DeptListPanel({ depts, depthMap }: { depts: DeptDto[]; depthMap: Map<string, number> }) {
  const { t } = useTranslation('admin');

  return (
    <div>
      <div className="mb-4 flex items-center">
        <span className="text-base font-bold">{t('users.deptList.title')}</span>
        <span className="ml-3 text-[calc(13px*var(--app-scale))] text-text-3">{t('users.deptList.subtitle')}</span>
      </div>
      <TableShell
        className="rounded-10"
        header={
          <TableShellHeader gridTemplateColumns={deptGridTemplate} className="px-4">
            <div>{t('users.columns.dept')}</div>
            <div>{t('users.columns.memberCount')}</div>
          </TableShellHeader>
        }
      >
        {depts.map((dept) => (
          <TableShellRow
            key={dept.id}
            gridTemplateColumns={deptGridTemplate}
            className="h-[calc(50px*var(--app-scale))] px-4"
          >
            <TableTreeCell depth={depthMap.get(dept.id) ?? 0}>
              <Folder className="size-4 text-text-3" />
              <span className="text-sm text-text">{dept.name}</span>
            </TableTreeCell>
            <div className="text-[calc(13px*var(--app-scale))] text-text-2">
              {t('users.memberCount', { count: dept.memberCount })}
            </div>
          </TableShellRow>
        ))}
      </TableShell>
    </div>
  );
}
