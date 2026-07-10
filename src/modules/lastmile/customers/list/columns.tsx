import type { ColumnDef } from '@tanstack/react-table';
import { DataTableRowActions } from '@/components/pro/DataTableRowActions';
import { StatusBadge } from '@/components/pro/StatusBadge';
import type { CustomerDto } from '../api';
import { customerTone, money } from '../model';

export function customerColumns(
  labels: Record<string, string>,
  onDetail: (id: string) => void,
): ColumnDef<CustomerDto>[] {
  return [
    { accessorKey: 'name', header: labels.customer, size: 180 },
    { accessorKey: 'code', header: labels.code, size: 110 },
    { accessorKey: 'type', header: labels.type, size: 110 },
    {
      id: 'channels',
      header: labels.channels,
      size: 180,
      cell: ({ row }) =>
        row.original.channels
          .filter((item) => item.authorized)
          .map((item) => item.carrier)
          .join(' · ') || '—',
    },
    { accessorKey: 'pricingPlan', header: labels.pricing, size: 130 },
    {
      id: 'balance',
      header: labels.balance,
      size: 110,
      meta: { cellAlign: 'end', headerAlign: 'end' },
      cell: ({ row }) => money(row.original.balance),
    },
    {
      id: 'status',
      header: labels.status,
      size: 90,
      cell: ({ row }) => (
        <StatusBadge tone={customerTone[row.original.status]}>
          {labels[`status.${row.original.status}`] ?? row.original.status}
        </StatusBadge>
      ),
    },
    {
      id: 'actions',
      header: labels.actions,
      size: 90,
      meta: { headerAlign: 'end', cellAlign: 'end', stopRowClick: true },
      cell: ({ row }) => (
        <DataTableRowActions
          overflowLabel={labels.actions ?? 'Actions'}
          actions={[
            { id: 'detail', label: labels.detail ?? 'Details', onSelect: () => onDetail(row.original.id) },
          ]}
        />
      ),
    },
  ];
}
