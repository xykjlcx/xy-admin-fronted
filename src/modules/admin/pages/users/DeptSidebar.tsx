import { useMemo, useState } from 'react';
import { Folder, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { DeptDto } from '@/modules/admin/api/user.api';

export function DeptSidebar({
  depts,
  depthMap,
  selectedDeptId,
  onSelectDept,
}: {
  depts: DeptDto[];
  depthMap: Map<string, number>;
  selectedDeptId?: string;
  onSelectDept: (deptId: string | undefined) => void;
}) {
  const { t } = useTranslation('admin');
  const [deptKeyword, setDeptKeyword] = useState('');
  const visibleDepts = useMemo(() => {
    const keyword = deptKeyword.trim();
    if (!keyword) return depts;
    return depts.filter((dept) => dept.name.includes(keyword));
  }, [deptKeyword, depts]);
  const allMemberCount = depts
    .filter((dept) => !dept.parentId)
    .reduce((total, dept) => total + dept.memberCount, 0);

  return (
    <aside className="w-[calc(248px*var(--app-scale))] shrink-0 border-r border-border px-3 py-4">
      <div className="mb-3 flex h-[calc(34px*var(--app-scale))] items-center gap-2 rounded-8 bg-surface-2 px-2.5">
        <Search className="size-3.5 text-text-3" />
        <input
          placeholder={t('users.deptSearchPlaceholder')}
          value={deptKeyword}
          className="min-w-0 flex-1 bg-transparent text-[calc(13px*var(--app-scale))] outline-none placeholder:text-text-3"
          onChange={(event) => setDeptKeyword(event.target.value)}
        />
      </div>
      <button
        type="button"
        className={cn(
          'mb-px flex h-9 w-full items-center gap-2 rounded-8 px-3 text-left text-sm transition-colors hover:bg-bg',
          !selectedDeptId ? 'bg-pri-soft font-semibold text-pri' : 'text-text-2',
        )}
        onClick={() => onSelectDept(undefined)}
        aria-label={`${t('users.allMembers')} ${allMemberCount}`}
      >
        <Folder className="size-4 opacity-70" />
        <span className="flex-1">{t('users.allMembers')}</span>
        <span className="text-xs text-text-3">{allMemberCount}</span>
      </button>
      {visibleDepts.map((dept) => (
        <button
          key={dept.id}
          type="button"
          className={cn(
            'mb-px flex h-9 w-full items-center gap-2 rounded-8 pr-3 text-left text-sm transition-colors hover:bg-bg',
            selectedDeptId === dept.id ? 'bg-pri-soft font-semibold text-pri' : 'text-text-2',
          )}
          style={{ paddingLeft: `calc(${12 + (depthMap.get(dept.id) ?? 0) * 18}px * var(--app-scale))` }}
          onClick={() => onSelectDept(dept.id)}
          aria-label={`${dept.name} ${dept.memberCount}`}
        >
          <Folder className="size-4 opacity-70" />
          <span className="min-w-0 flex-1 truncate">{dept.name}</span>
          <span className="text-xs text-text-3">{dept.memberCount}</span>
        </button>
      ))}
    </aside>
  );
}
