import { useMemo, useState } from 'react';
import { Folder } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SearchField } from '@/components/pro/SearchField';
import { SideList, type SideListItem } from '@/components/pro/SideList';
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
  const items = [
    {
      id: '__all__',
      label: t('users.allMembers'),
      meta: allMemberCount,
      icon: <Folder className="size-4 opacity-70" />,
    },
    ...visibleDepts.map((dept) => ({
      id: dept.id,
      label: dept.name,
      meta: dept.memberCount,
      depth: depthMap.get(dept.id) ?? 0,
      icon: <Folder className="size-4 opacity-70" />,
    })),
  ] satisfies SideListItem[];

  return (
    <SideList
      items={items}
      activeId={selectedDeptId ?? '__all__'}
      onSelect={(id) => onSelectDept(id === '__all__' ? undefined : id)}
      search={
        <SearchField
          placeholder={t('users.deptSearchPlaceholder')}
          value={deptKeyword}
          onChange={(event) => setDeptKeyword(event.target.value)}
        />
      }
    />
  );
}
