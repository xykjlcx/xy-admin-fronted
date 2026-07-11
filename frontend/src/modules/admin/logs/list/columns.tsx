import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import type { LoginLogDto, OperationLogDto, OperationType } from '../api';

const operationVariant: Record<
  Exclude<OperationType, 'all'>,
  'success' | 'primary' | 'danger' | 'warning' | 'purple' | 'teal'
> = {
  create: 'success',
  edit: 'primary',
  del: 'danger',
  export: 'warning',
  perm: 'purple',
  config: 'teal',
};

export function operationColumns(labels: Record<string, string>): ColumnDef<OperationLogDto>[] {
  return [
    { accessorKey: 'occurredAt', header: labels.time, size: 180 },
    { accessorKey: 'operator', header: labels.operator, size: 130 },
    { accessorKey: 'module', header: labels.module, size: 140 },
    {
      accessorKey: 'type',
      header: labels.type,
      size: 120,
      cell: ({ row }) => (
        <Badge variant={operationVariant[row.original.type]}>{labels[`type.${row.original.type}`]}</Badge>
      ),
    },
    { accessorKey: 'target', header: labels.target, size: 280 },
    { accessorKey: 'ip', header: labels.ip, size: 150 },
  ];
}

export function loginColumns(labels: Record<string, string>): ColumnDef<LoginLogDto>[] {
  return [
    { accessorKey: 'occurredAt', header: labels.loginTime, size: 180 },
    { accessorKey: 'user', header: labels.user, size: 140 },
    {
      accessorKey: 'result',
      header: labels.result,
      size: 110,
      cell: ({ row }) => (
        <Badge variant={row.original.result === 'ok' ? 'success' : 'danger'}>
          {labels[`result.${row.original.result}`]}
        </Badge>
      ),
    },
    { accessorKey: 'ip', header: labels.ip, size: 150 },
    { accessorKey: 'location', header: labels.location, size: 120 },
    { accessorKey: 'device', header: labels.device, size: 220 },
  ];
}
