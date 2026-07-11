import { useState } from 'react';
import { Bell, KeyRound, Monitor, Settings, ShieldCheck, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageFrame } from '@/components/pro/PageScaffold';
import { SideList } from '@/components/pro/SideList';
import { Button } from '@/components/ui/button';
import type { ProfileTab } from '../types';
import { ProfileBanner } from './ProfileBanner';
import { ProfileDevicesPanel } from './ProfileDevicesPanel';
import { ProfileInfoPanel } from './ProfileInfoPanel';
import { ProfilePreferencesPanel } from './ProfilePreferencesPanel';
import { ProfileSecurityPanel } from './ProfileSecurityPanel';

export function ProfileScene({
  activeTab,
  onTabChange,
  onOpenMessages,
  passwordInitially = false,
}: {
  permissions: string[];
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
  onOpenMessages?: () => void;
  passwordInitially?: boolean;
}) {
  const { t } = useTranslation('admin');
  const [editing, setEditing] = useState(false);
  const items = [
    { id: 'info', label: t('profile.tabs.info'), icon: <User /> },
    { id: 'security', label: t('profile.tabs.security'), icon: <ShieldCheck /> },
    { id: 'preferences', label: t('profile.tabs.preferences'), icon: <Settings /> },
    { id: 'devices', label: t('profile.tabs.devices'), icon: <Monitor /> },
  ];
  return (
    <PageFrame breadcrumbs={[{ label: t('profile.breadcrumbGroup') }, { label: t('profile.title') }]}>
      <ProfileBanner
        onEdit={() => {
          onTabChange('info');
          setEditing(true);
        }}
      />
      <div className="mt-4 grid items-start gap-4 lg:grid-cols-[calc(236px*var(--app-scale))_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-12 border border-(--side-list-border) bg-(--side-list-bg)">
          <SideList
            items={items}
            activeId={activeTab}
            onSelect={(id) =>
              onTabChange(id === 'security' || id === 'preferences' || id === 'devices' ? id : 'info')
            }
          />
          <div className="border-t border-(--side-list-border) p-2">
            <Button variant="ghost" block className="justify-start" onClick={onOpenMessages}>
              <Bell data-icon="inline-start" />
              {t('profile.actions.messages')}
            </Button>
            <Button
              variant="ghost"
              block
              className="justify-start"
              onClick={() => {
                onTabChange('security');
              }}
            >
              <KeyRound data-icon="inline-start" />
              {t('profile.password.action')}
            </Button>
          </div>
        </div>
        <main className="min-w-0">
          {activeTab === 'info' && <ProfileInfoPanel editing={editing} onEditingChange={setEditing} />}
          {activeTab === 'security' && <ProfileSecurityPanel openPasswordInitially={passwordInitially} />}
          {activeTab === 'preferences' && <ProfilePreferencesPanel />}
          {activeTab === 'devices' && <ProfileDevicesPanel />}
        </main>
      </div>
    </PageFrame>
  );
}
