import type { ColumnDef } from '@tanstack/react-table';
import { DataTableRowActions, type DataTableRowAction } from '@/components/pro/DataTableRowActions';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import type { DictionaryItemColor, DictionaryItemDto } from '../api';

const colorVariant: Record<DictionaryItemColor, 'primary' | 'success' | 'warning' | 'danger' | 'neutral'> = {
  primary: 'primary',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  neutral: 'neutral',
};

export function dictionaryItemColumns({
  labels,
  canUpdate,
  canDelete,
  onEdit,
  onDelete,
  onEnabledChange,
}: {
  labels: {
    label: string;
    value: string;
    sort: string;
    status: string;
    remark: string;
    actions: string;
    enabled: string;
    disabled: string;
    edit: string;
    delete: string;
    more: string;
  };
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: (item: DictionaryItemDto) => void;
  onDelete: (item: DictionaryItemDto) => void;
  onEnabledChange: (item: DictionaryItemDto, enabled: boolean) => void;
}): ColumnDef<DictionaryItemDto>[] {
  return [
    {
      accessorKey: 'label',
      header: labels.label,
      size: 100,
      minSize: 92,
      cell: ({ row }) => <Badge variant={colorVariant[row.original.color]}>{row.original.label}</Badge>,
    },
    { accessorKey: 'value', header: labels.value, size: 100, minSize: 92 },
    {
      accessorKey: 'sort',
      header: labels.sort,
      size: 55,
      minSize: 52,
      meta: { cellAlign: 'center', headerAlign: 'center' },
    },
    {
      id: 'status',
      header: labels.status,
      size: 95,
      minSize: 88,
      meta: { cellAlign: 'center', headerAlign: 'center', stopRowClick: true },
      cell: ({ row }) => (
        <div className="flex items-center justify-center gap-2">
          <Switch
            size="sm"
            checked={row.original.enabled}
            disabled={!canUpdate}
            aria-label={`${row.original.label} ${labels.status}`}
            onCheckedChange={(enabled) => onEnabledChange(row.original, enabled)}
          />
          <span>{row.original.enabled ? labels.enabled : labels.disabled}</span>
        </div>
      ),
    },
    { accessorKey: 'remark', header: labels.remark, size: 150, minSize: 128 },
    {
      id: 'actions',
      header: labels.actions,
      size: 100,
      minSize: 92,
      meta: { pin: 'right', stopRowClick: true },
      cell: ({ row }) => {
        const actions: DataTableRowAction[] = [];
        if (canUpdate) actions.push({ id: 'edit', label: labels.edit, onSelect: () => onEdit(row.original) });
        if (canDelete)
          actions.push({
            id: 'delete',
            label: labels.delete,
            onSelect: () => onDelete(row.original),
            tone: 'danger',
          });
        return <DataTableRowActions overflowLabel={labels.more} actions={actions} />;
      },
    },
  ];
}
