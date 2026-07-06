import { useState, type JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { PageFrame, PageSurface, PageTabs } from '@/components/pro/PageScaffold';
import { DeptScene } from './list/DeptScene';
import { MembersScene } from './list/MembersScene';
import type { TabKey, UsersSearch } from './types';
import type { UsersQueryParams } from './api';

interface UsersPageProps {
  permissions: string[];
  search: UsersSearch;
  onSearchChange: (patch: Partial<UsersQueryParams>) => void;
}

export function UsersPage({ permissions, search, onSearchChange }: UsersPageProps): JSX.Element {
  const { t } = useTranslation('admin');
  const [tab, setTab] = useState<TabKey>(search.status === 'left' ? 'left' : 'members');
  const activeTab: TabKey = search.status === 'left' ? 'left' : tab;
  const tabItems = [
    { value: 'members', label: t('users.tabs.members') },
    { value: 'depts', label: t('users.tabs.depts') },
    { value: 'left', label: t('users.tabs.left') },
  ] satisfies { value: TabKey; label: string }[];

  const switchTab = (next: TabKey) => {
    setTab(next);
    if (next === 'left') onSearchChange({ status: 'left', page: 1 });
    if (next === 'members') onSearchChange({ status: 'all', page: 1 });
    if (next === 'depts' && search.status === 'left') onSearchChange({ status: 'all', page: 1 });
  };

  return (
    <PageFrame breadcrumbs={[{ label: t('users.breadcrumbGroup') }, { label: t('users.title') }]}>
      <PageSurface>
        <PageTabs value={activeTab} items={tabItems} onValueChange={switchTab} />

        {activeTab === 'depts' ? (
          <DeptScene search={search} onSearchChange={onSearchChange} />
        ) : (
          <MembersScene
            key={activeTab}
            variant={activeTab}
            permissions={permissions}
            search={search}
            onSearchChange={onSearchChange}
          />
        )}
      </PageSurface>
    </PageFrame>
  );
}
