import { useMemo, useState } from 'react';
import { Plus, Search, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
      <div className="mb-3 flex h-[calc(34px*var(--app-scale))] items-center gap-2 rounded-8 bg-surface-2 px-2.5">
        <Search className="size-3.5 text-text-3" />
        <input
          placeholder={t('roles.searchPlaceholder')}
          value={roleKeyword}
          className="min-w-0 flex-1 bg-transparent text-[calc(13px*var(--app-scale))] outline-none placeholder:text-text-3"
          onChange={(event) => setRoleKeyword(event.target.value)}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {visibleRoles.length > 0 ? (
          visibleRoles.map((role) => (
            <button
              key={role.id}
              type="button"
              className={cn(
                'my-0.5 flex h-11 w-full items-center gap-2 rounded-8 px-3 text-left text-sm transition-colors hover:bg-bg',
                role.id === currentRoleId ? 'bg-pri-soft font-semibold text-pri' : 'text-text',
              )}
              onClick={() => onActiveRoleChange(role.id)}
            >
              <UserRound className="size-4 shrink-0 opacity-75" />
              <span className="min-w-0 flex-1 truncate">{role.name}</span>
              <RoleTypeChip type={role.type} label={t(`roles.roleTypes.${role.type}`)} />
            </button>
          ))
        ) : (
          <div className="px-3 py-8 text-center text-sm text-text-3">{t('roles.empty')}</div>
        )}
      </div>

      {canCreateRole && (
        <button
          type="button"
          className="mt-3 flex h-10 items-center justify-center gap-1.5 rounded-8 border border-dashed border-border text-sm text-text-2 transition-colors hover:border-pri hover:text-pri"
          onClick={onCreateRole}
        >
          <Plus className="size-4" />
          {t('roles.actions.addRole')}
        </button>
      )}
    </aside>
  );
}
