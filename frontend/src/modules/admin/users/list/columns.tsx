import type { ColumnDef } from '@tanstack/react-table';
import type { TFunction } from 'i18next';
import { DataTableRowActions, type DataTableRowAction } from '@/components/pro/DataTableRowActions';
import { StatusBadge } from '@/components/pro/StatusBadge';
import { Button } from '@/components/ui/button';
import { matchPermission } from '@/lib/permission';
import { cn } from '@/lib/utils';
import { avatarClasses, initials, statusTone } from '../model';
import type { DeptDto, UserDto } from '../api';

interface UserColumnsContext {
  t: TFunction<'admin'>;
  permissions: string[];
  systemAdmin?: boolean;
  deptById: Map<string, DeptDto>;
  onView?: (user: UserDto) => void;
  onEdit?: (user: UserDto) => void;
  onDelete?: (user: UserDto) => void;
}

export function userColumns({
  t,
  permissions,
  systemAdmin = false,
  deptById,
  onView,
  onEdit,
  onDelete,
}: UserColumnsContext): ColumnDef<UserDto>[] {
  const canUpdate = !!onEdit && matchPermission({ permissions, systemAdmin }, 'iam:user:update');
  const canDelete = !!onDelete && matchPermission({ permissions, systemAdmin }, 'iam:user:del');

  return [
    {
      id: 'name',
      header: t('users.columns.name'),
      size: 220,
      minSize: 180,
      maxSize: 280,
      enableSorting: false,
      cell: ({ row }) => {
        const user = row.original;
        const index = row.index;

        return (
          <div className="flex min-w-0 items-center gap-2.5">
            <div
              className={cn(
                'flex size-[calc(30px*var(--app-scale))] shrink-0 items-center justify-center rounded-full text-[calc(13px*var(--app-scale))] font-semibold text-white',
                avatarClasses[index % avatarClasses.length],
              )}
            >
              {initials(user.name)}
            </div>
            {onView ? (
              <Button
                type="button"
                variant="link"
                size="xs"
                className="min-w-0 shrink"
                onClick={(event) => {
                  event.stopPropagation();
                  onView(user);
                }}
              >
                <span className="truncate">{user.name}</span>
              </Button>
            ) : (
              <span className="truncate text-sm text-text">{user.name}</span>
            )}
          </div>
        );
      },
    },
    {
      id: 'status',
      header: t('users.columns.status'),
      size: 120,
      minSize: 100,
      maxSize: 140,
      enableSorting: false,
      cell: ({ row }) => {
        const user = row.original;

        return <StatusBadge tone={statusTone(user.status)}>{t(`users.status.${user.status}`)}</StatusBadge>;
      },
    },
    {
      id: 'phone',
      header: t('users.columns.phone'),
      size: 180,
      minSize: 160,
      maxSize: 220,
      enableSorting: false,
      cell: ({ row }) => {
        const user = row.original;

        return (
          <span className="block truncate text-[calc(13px*var(--app-scale))] text-text-2">{user.phone}</span>
        );
      },
    },
    {
      id: 'dept',
      header: t('users.columns.dept'),
      size: 180,
      minSize: 150,
      maxSize: 240,
      enableSorting: false,
      cell: ({ row }) => {
        const user = row.original;

        return (
          <span className="block truncate text-[calc(13px*var(--app-scale))] text-text-2">
            {deptById.get(user.deptId)?.name ?? '-'}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: t('users.columns.actions'),
      size: 112,
      minSize: 112,
      maxSize: 112,
      enablePinning: true,
      meta: { headerAlign: 'start', cellAlign: 'start', pin: 'right', stopRowClick: true },
      enableSorting: false,
      cell: ({ row }) => {
        const user = row.original;
        const actions: DataTableRowAction[] = [];

        if (canUpdate) {
          actions.push({ id: 'edit', label: t('users.actions.edit'), onSelect: () => onEdit(user) });
        }
        if (canDelete) {
          actions.push({
            id: 'delete',
            label: t('users.actions.delete'),
            onSelect: () => onDelete(user),
            tone: 'danger',
          });
        }

        return <DataTableRowActions actions={actions} overflowLabel={t('users.actions.more')} />;
      },
    },
  ];
}
