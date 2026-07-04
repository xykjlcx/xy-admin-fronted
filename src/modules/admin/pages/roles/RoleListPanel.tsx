import { useMemo, useState } from 'react';
import { Plus, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SearchField } from '@/components/pro/SearchField';
import { Button } from '@/components/ui/button';
import { Empty } from '@/components/ui/empty';
import { cn } from '@/lib/utils';
import type { RoleDto } from '@/modules/admin/api/role.api';
import { RoleTypeChip } from './RoleTypeChip';

export function RoleListPanel({
  roles,
  currentRoleId,
  canCreateRole,
  onActiveRoleChange,
  onCreateRole,
}: {
  roles: RoleDto[];
  currentRoleId: string;
  canCreateRole: boolean;
  onActiveRoleChange: (id: string) => void;
  onCreateRole: () => void;
}) {
  const { t } = useTranslation('admin');
  const [roleKeyword, setRoleKeyword] = useState('');
  const visibleRoles = useMemo(() => {
    const keyword = roleKeyword.trim().toLowerCase();
    if (!keyword) return roles;
    return roles.filter((role) => role.name.toLowerCase().includes(keyword) || role.desc.toLowerCase().includes(keyword));
  }, [roleKeyword, roles]);

  return (
    <aside className="flex w-[calc(280px*var(--app-scale))] shrink-0 flex-col border-r border-border px-3 py-4">
      <SearchField
        containerClassName="mb-3"
        placeholder={t('roles.searchPlaceholder')}
        value={roleKeyword}
        onChange={(event) => setRoleKeyword(event.target.value)}
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        {visibleRoles.length > 0 ? (
          visibleRoles.map((role) => (
            <Button
              key={role.id}
              type="button"
              variant="ghost"
              className={cn(
                'my-0.5 flex h-11 w-full items-center gap-2 rounded-8 px-3 text-left text-sm transition-colors hover:bg-bg',
                role.id === currentRoleId ? 'bg-pri-soft font-semibold text-pri' : 'text-text',
              )}
              onClick={() => onActiveRoleChange(role.id)}
            >
              <UserRound data-icon="inline-start" className="opacity-75" />
              <span className="min-w-0 flex-1 truncate">{role.name}</span>
              <RoleTypeChip type={role.type} label={t(`roles.roleTypes.${role.type}`)} />
            </Button>
          ))
        ) : (
          <Empty title={t('roles.empty')} className="px-3 py-8" />
        )}
      </div>

      {canCreateRole && (
        <Button
          type="button"
          variant="dashed"
          className="mt-3 h-10"
          block
          onClick={onCreateRole}
        >
          <Plus data-icon="inline-start" />
          {t('roles.actions.addRole')}
        </Button>
      )}
    </aside>
  );
}
