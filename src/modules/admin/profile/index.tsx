import { useState } from 'react';
import { ProfileScene } from './detail/ProfileScene';
import type { ProfileTab } from './types';

export function ProfilePage({
  permissions,
  initialTab = 'info',
  tab,
  action,
  onTabChange,
  onOpenMessages,
}: {
  permissions: string[];
  initialTab?: ProfileTab;
  tab?: ProfileTab;
  action?: 'password';
  onTabChange?: (tab: ProfileTab) => void;
  onOpenMessages?: () => void;
}) {
  const [localTab, setLocalTab] = useState(initialTab);
  const activeTab = tab ?? localTab;
  const changeTab = (next: ProfileTab) => {
    setLocalTab(next);
    onTabChange?.(next);
  };
  return (
    <ProfileScene
      permissions={permissions}
      activeTab={activeTab}
      onTabChange={changeTab}
      onOpenMessages={onOpenMessages}
      passwordInitially={activeTab === 'security' && action === 'password'}
    />
  );
}
