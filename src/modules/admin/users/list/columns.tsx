import type { ColumnDef } from '@tanstack/react-table';
import type { TFunction } from 'i18next';
import { MoreHorizontal } from 'lucide-react';
import { StatusBadge } from '@/components/pro/StatusBadge';
import { Button } from '@/components/ui/button';
import { matchPermission } from '@/lib/permission';
import { cn } from '@/lib/utils';
import { avatarClasses, initials, statusTone } from '../model';
import type { DeptDto, UserDto } from '../api';

interface UserColumnsContext {
  t: TFunction<'admin'>;
  permissions: string[];
  deptById: Map<string, DeptDto>;
  onView?: (user: UserDto) => void;
  onEdit?: (user: UserDto) => void;
  onDelete?: (user: UserDto) => void;
}

export function userColumnsV2({
  t,
  permissions,
  deptById,
  onView,
  onEdit,
  onDelete,
}: UserColumnsContext): ColumnDef<UserDto>[] {
  const canUpdate = !!onEdit && matchPermission(permissions, 'iam:user:update');
  const canDelete = !!onDelete && matchPermission(permissions, 'iam:user:del');

  return [
    {
      id: 'name',
      header: t('users.columns.name'),
      meta: { width: '24%' },
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
            <span className="truncate text-sm text-text">{user.name}</span>
          </div>
        );
      },
    },
    {
      id: 'status',
      header: t('users.columns.status'),
      meta: { width: '17%' },
      enableSorting: false,
      cell: ({ row }) => {
        const user = row.original;

        return <StatusBadge tone={statusTone(user.status)}>{t(`users.status.${user.status}`)}</StatusBadge>;
      },
    },
    {
      id: 'phone',
      header: t('users.columns.phone'),
      meta: { width: '24%' },
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
      meta: { width: '17%' },
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
      meta: { width: 'calc(120px * var(--app-scale))', align: 'end' },
      enableSorting: false,
      cell: ({ row }) => {
        const user = row.original;

        return (
          <div className="flex items-center gap-3.5 text-[calc(13px*var(--app-scale))]">
            {onView && (
              <Button type="button" variant="link" size="xs" onClick={() => onView(user)}>
                {t('users.actions.detail')}
              </Button>
            )}
            {canUpdate && (
              <Button type="button" variant="link" size="xs" onClick={() => onEdit(user)}>
                {t('users.actions.edit')}
              </Button>
            )}
            {canDelete && (
              <Button type="button" variant="ghost" size="icon-xs" onClick={() => onDelete(user)}>
                <MoreHorizontal />
                <span className="sr-only">{t('users.actions.deleteName', { name: user.name })}</span>
              </Button>
            )}
          </div>
        );
      },
    },
  ];
}
