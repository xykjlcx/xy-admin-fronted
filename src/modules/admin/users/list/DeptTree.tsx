import { useMemo, useState, type JSX } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Folder } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SearchField } from '@/components/pro/SearchField';
import { Tree, type TreeNode } from '@/components/pro/Tree';
import { deptsQuery } from '../api';
import { buildDepthMap } from '../model';

interface DeptTreeProps {
  selectedId?: string;
  onSelect: (deptId: string | undefined) => void;
}

export function DeptTree({ selectedId, onSelect }: DeptTreeProps): JSX.Element {
  const { t } = useTranslation('admin');
  const { data: depts = [] } = useQuery(deptsQuery);
  const [deptKeyword, setDeptKeyword] = useState('');
  const depthMap = useMemo(() => buildDepthMap(depts), [depts]);
  const visibleDepts = useMemo(() => {
    const keyword = deptKeyword.trim();
    if (!keyword) return depts;
    return depts.filter((dept) => dept.name.includes(keyword));
  }, [deptKeyword, depts]);
  const allMemberCount = depts
    .filter((dept) => !dept.parentId)
    .reduce((total, dept) => total + dept.memberCount, 0);
  const nodes = [
    {
      id: '__all__',
      label: (
        <span className="inline-flex min-w-0 items-center gap-2">
          <Folder className="size-4 shrink-0 opacity-70" />
          <span className="truncate">{t('users.allMembers')}</span>
        </span>
      ),
      meta: allMemberCount,
      depth: 0,
    },
    ...visibleDepts.map((dept) => ({
      id: dept.id,
      label: (
        <span className="inline-flex min-w-0 items-center gap-2">
          <Folder className="size-4 shrink-0 opacity-70" />
          <span className="truncate">{dept.name}</span>
        </span>
      ),
      meta: dept.memberCount,
      depth: depthMap.get(dept.id) ?? 0,
    })),
  ] satisfies TreeNode[];

  return (
    <aside className="w-[calc(248px*var(--app-scale))] shrink-0 border-r border-(--side-list-border) bg-(--side-list-bg) px-3 py-4">
      <div className="mb-3">
        <SearchField
          placeholder={t('users.deptSearchPlaceholder')}
          value={deptKeyword}
          onChange={(event) => setDeptKeyword(event.target.value)}
        />
      </div>
      <Tree
        nodes={nodes}
        selectedId={selectedId ?? '__all__'}
        ariaLabel={t('users.deptTitle')}
        onSelect={(id) => onSelect(id === '__all__' ? undefined : id)}
      />
    </aside>
  );
}
