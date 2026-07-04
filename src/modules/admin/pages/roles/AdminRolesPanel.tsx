import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { TableShell, TableShellHeader, TableShellRow } from '@/components/pro/TableShell';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AdminRoleDto } from '@/modules/admin/api/role.api';
import { RoleTypeChip } from './RoleTypeChip';
import { adminGridTemplate, avatarClasses, initials } from './model';

export function AdminRolesPanel({
  adminRoles,
  canCreateAdmin,
  onCreateAdmin,
}: {
  adminRoles: AdminRoleDto[];
  canCreateAdmin: boolean;
  onCreateAdmin: () => void;
}) {
  const { t } = useTranslation('admin');

  return (
    <div className="px-7 py-[calc(22px*var(--app-scale))]">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[calc(13px*var(--app-scale))] text-text-3">{t('roles.adminIntro')}</span>
        {canCreateAdmin && (
          <Button
            type="button"
            size="sm"
            onClick={onCreateAdmin}
          >
            <Plus data-icon="inline-start" />
            {t('roles.actions.createAdmin')}
          </Button>
        )}
      </div>

      <TableShell
        header={
          <TableShellHeader gridTemplateColumns={adminGridTemplate} className="px-4">
            <div>{t('roles.columns.adminRole')}</div>
            <div>{t('roles.columns.admin')}</div>
            <div>{t('roles.columns.scope')}</div>
            <div>{t('roles.columns.actions')}</div>
          </TableShellHeader>
        }
        className="rounded-10"
      >
        {adminRoles.map((role, index) => (
          <TableShellRow
            key={role.id}
            gridTemplateColumns={adminGridTemplate}
            className="h-[calc(60px*var(--app-scale))] px-4"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-sm font-medium text-text">{role.name}</span>
              <RoleTypeChip type={role.type} label={t(`roles.roleTypes.${role.type}`)} />
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <div
                className={cn(
                  'flex size-[calc(26px*var(--app-scale))] shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white',
                  avatarClasses[index % avatarClasses.length],
                )}
              >
                {initials(role.admin)}
              </div>
              <span className="truncate text-sm text-text-2">{role.admin}</span>
            </div>
            <div className="truncate text-[calc(13px*var(--app-scale))] text-text-2">{role.scope}</div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="text" size="xs" onClick={() => toast(t('roles.toast.stub'))}>
                {t('roles.actions.detail')}
              </Button>
              <Button type="button" variant="text" size="xs" onClick={() => toast(t('roles.toast.stub'))}>
                {t('roles.actions.add')}
              </Button>
            </div>
          </TableShellRow>
        ))}
      </TableShell>
    </div>
  );
}
