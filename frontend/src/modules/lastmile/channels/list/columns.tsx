import type { ColumnDef } from '@tanstack/react-table';
import { DataTableRowActions } from '@/components/pro/DataTableRowActions';
import { StatusBadge } from '@/components/pro/StatusBadge';
import { Switch } from '@/components/ui/switch';
import type { ChannelDto } from '../api';
import { channelKindTone, money } from '../model';
export function channelColumns(
  labels: Record<string, string>,
  actions: {
    detail: (id: string) => void;
    edit: (id: string) => void;
    toggle: (id: string, enabled: boolean) => void;
  },
): ColumnDef<ChannelDto>[] {
  return [
    { accessorKey: 'code', header: labels.code, size: 175 },
    { accessorKey: 'name', header: labels.name, size: 200 },
    {
      id: 'kind',
      header: labels.kind,
      size: 100,
      cell: ({ row }) => (
        <StatusBadge tone={channelKindTone[row.original.kind]}>
          {labels[`kind.${row.original.kind}`] ?? row.original.kind}
        </StatusBadge>
      ),
    },
    { accessorKey: 'supplier', header: labels.supplier, size: 120 },
    { accessorKey: 'carrier', header: labels.carrier, size: 90 },
    { accessorKey: 'service', header: labels.service, size: 135 },
    {
      id: 'countries',
      header: labels.countries,
      size: 145,
      cell: ({ row }) => row.original.countries.join(' · '),
    },
    {
      id: 'account',
      header: labels.account,
      size: 120,
      cell: ({ row }) => labels[`account.${row.original.accountOwner}`],
    },
    {
      id: 'cost',
      header: labels.cost,
      size: 90,
      meta: { headerAlign: 'end', cellAlign: 'end' },
      cell: ({ row }) => money(row.original.cost),
    },
    {
      id: 'price',
      header: labels.sell,
      size: 90,
      meta: { headerAlign: 'end', cellAlign: 'end' },
      cell: ({ row }) => money(row.original.price),
    },
    {
      id: 'status',
      header: labels.status,
      size: 90,
      meta: { headerAlign: 'center', cellAlign: 'center', stopRowClick: true },
      cell: ({ row }) => (
        <Switch
          aria-label={`${row.original.name} ${labels.status ?? 'Status'}`}
          checked={row.original.enabled}
          onCheckedChange={(enabled) => actions.toggle(row.original.id, enabled)}
        />
      ),
    },
    {
      id: 'actions',
      header: labels.actions,
      size: 110,
      meta: { headerAlign: 'end', cellAlign: 'end', stopRowClick: true },
      cell: ({ row }) => (
        <DataTableRowActions
          overflowLabel={labels.actions ?? 'Actions'}
          actions={[
            {
              id: 'detail',
              label: labels.detail ?? 'Details',
              onSelect: () => actions.detail(row.original.id),
            },
            { id: 'edit', label: labels.edit ?? 'Edit', onSelect: () => actions.edit(row.original.id) },
          ]}
        />
      ),
    },
  ];
}
