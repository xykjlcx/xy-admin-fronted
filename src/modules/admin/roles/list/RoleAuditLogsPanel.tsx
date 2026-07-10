import { useDeferredValue, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useTranslation } from 'react-i18next';
import { DataTable } from '@/components/pro/DataTable';
import { FilterSelect } from '@/components/pro/FilterSelect';
import { SearchField } from '@/components/pro/SearchField';
import { Badge } from '@/components/ui/badge';
import type { RoleAuditLogDto, RoleAuditLogKind, RoleDto } from '@/modules/admin/roles/api';

type AuditKindFilter = 'all' | RoleAuditLogKind;

const auditKindBadge: Record<RoleAuditLogKind, 'neutral' | 'primary' | 'success' | 'danger' | 'warning'> = {
  create: 'success',
  edit: 'warning',
  grant: 'primary',
  remove: 'danger',
  dataScope: 'neutral',
};

export function RoleAuditLogsPanel({
  logs,
  roles,
  loading,
}: {
  logs: RoleAuditLogDto[];
  roles: RoleDto[];
  loading: boolean;
}) {
  const { t } = useTranslation('admin');
  const [keyword, setKeyword] = useState('');
  const [roleId, setRoleId] = useState('all');
  const [kind, setKind] = useState<AuditKindFilter>('all');
  const deferredKeyword = useDeferredValue(keyword.trim().toLowerCase());
  const kindOptions = useMemo(
    () =>
      (['all', 'create', 'edit', 'grant', 'remove', 'dataScope'] as const).map((value) => ({
        value,
        label: t(`roles.auditLogs.kinds.${value}`),
      })),
    [t],
  );
  const roleOptions = useMemo(
    () => [
      { value: 'all', label: t('roles.auditLogs.allRoles') },
      ...roles.map((role) => ({ value: role.id, label: role.name })),
    ],
    [roles, t],
  );
  const visibleLogs = useMemo(
    () =>
      logs.filter((log) => {
        if (roleId !== 'all' && log.roleId !== roleId) return false;
        if (kind !== 'all' && log.kind !== kind) return false;
        if (!deferredKeyword) return true;
        return [log.operator, log.roleName, log.change].some((value) =>
          value.toLowerCase().includes(deferredKeyword),
        );
      }),
    [deferredKeyword, kind, logs, roleId],
  );
  const columns = useMemo<ColumnDef<RoleAuditLogDto>[]>(
    () => [
      {
        accessorKey: 'occurredAt',
        header: t('roles.auditLogs.columns.occurredAt'),
        size: 160,
        minSize: 160,
      },
      {
        accessorKey: 'operator',
        header: t('roles.auditLogs.columns.operator'),
        size: 120,
        minSize: 120,
      },
      {
        accessorKey: 'roleName',
        header: t('roles.auditLogs.columns.role'),
        size: 140,
        minSize: 140,
      },
      {
        accessorKey: 'kind',
        header: t('roles.auditLogs.columns.kind'),
        cell: ({ row }) => (
          <Badge variant={auditKindBadge[row.original.kind]}>
            {t(`roles.auditLogs.kinds.${row.original.kind}`)}
          </Badge>
        ),
        size: 130,
        minSize: 130,
      },
      {
        accessorKey: 'change',
        header: t('roles.auditLogs.columns.change'),
      },
    ],
    [t],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col px-7 py-[calc(22px*var(--app-scale))]">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchField
          aria-label={t('roles.auditLogs.searchLabel')}
          placeholder={t('roles.auditLogs.searchPlaceholder')}
          value={keyword}
          containerClassName="w-[calc(280px*var(--app-scale))]"
          onChange={(event) => setKeyword(event.target.value)}
        />
        <FilterSelect
          label={t('roles.auditLogs.filters.role')}
          value={roleId}
          options={roleOptions}
          onValueChange={setRoleId}
        />
        <FilterSelect
          label={t('roles.auditLogs.filters.kind')}
          value={kind}
          options={kindOptions}
          onValueChange={setKind}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-6">
        <DataTable
          columns={columns}
          data={visibleLogs}
          rowKey={(log) => log.id}
          loading={loading}
          emptyText={t('roles.auditLogs.empty')}
          loadingText={t('roles.refreshing')}
        />
      </div>
    </div>
  );
}
