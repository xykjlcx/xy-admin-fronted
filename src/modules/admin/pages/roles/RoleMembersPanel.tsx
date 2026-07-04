import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { RoleMemberDto } from '@/modules/admin/api/role.api';
import { avatarClasses, initials } from './model';

export function RoleMembersPanel({ members }: { members: RoleMemberDto[] }) {
  const { t } = useTranslation('admin');

  return (
    <div className="grid grid-cols-2 gap-3">
      {members.map((member, index) => (
        <div key={member.id} className="flex items-center gap-3 rounded-10 border border-border px-4 py-3.5">
          <div
            className={cn(
              'flex size-[calc(32px*var(--app-scale))] shrink-0 items-center justify-center rounded-full text-[calc(13px*var(--app-scale))] font-semibold text-white',
              avatarClasses[index % avatarClasses.length],
            )}
          >
            {initials(member.name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-text">{member.name}</div>
            <div className="mt-0.5 truncate text-xs text-text-3">
              {member.deptLabel} · {member.title}
            </div>
          </div>
          <Button type="button" variant="text" size="xs" className="text-danger hover:bg-danger-soft">
            {t('roles.actions.removeMember')}
          </Button>
        </div>
      ))}
    </div>
  );
}
