import type { ColumnDef } from '@tanstack/react-table';
import { DataTableRowActions } from '@/components/pro/DataTableRowActions';
import { StatusBadge } from '@/components/pro/StatusBadge';
import type { ShipmentDto } from '../api';
import { money, shipmentTone } from '../model';

export function shipmentColumns(
  labels: Record<string, string>,
  actions: { detail: (id: string) => void; print: (id: string) => void; track: (id: string) => void },
): ColumnDef<ShipmentDto>[] {
  return [
    { accessorKey: 'no', header: labels.no, size: 145 },
    { accessorKey: 'customer', header: labels.customer, size: 155 },
    { accessorKey: 'country', header: labels.country, size: 110 },
    { accessorKey: 'channel', header: labels.channel, size: 150 },
    {
      id: 'weight',
      header: labels.weight,
      size: 80,
      cell: ({ row }) => `${row.original.weight.toFixed(2)} kg`,
    },
    {
      id: 'fee',
      header: labels.fee,
      size: 90,
      meta: { cellAlign: 'end', headerAlign: 'end' },
      cell: ({ row }) => money(row.original.fee),
    },
    { accessorKey: 'trackingNo', header: labels.tracking, size: 145 },
    {
      id: 'status',
      header: labels.status,
      size: 100,
      cell: ({ row }) => (
        <StatusBadge tone={shipmentTone[row.original.status]}>
          {labels[`status.${row.original.status}`] ?? row.original.status}
        </StatusBadge>
      ),
    },
    {
      id: 'actions',
      header: labels.actions,
      size: 150,
      meta: { headerAlign: 'end', cellAlign: 'end', stopRowClick: true },
      cell: ({ row }) => (
        <DataTableRowActions
          overflowLabel={labels.more ?? 'Actions'}
          actions={[
            {
              id: 'detail',
              label: labels.detail ?? 'Details',
              onSelect: () => actions.detail(row.original.id),
            },
            {
              id: 'print',
              label: labels.print ?? 'Print',
              disabled: row.original.status !== 'pending',
              onSelect: () => actions.print(row.original.id),
            },
            { id: 'track', label: labels.track ?? 'Track', onSelect: () => actions.track(row.original.id) },
          ]}
        />
      ),
    },
  ];
}
