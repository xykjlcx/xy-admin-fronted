import { useMemo, type JSX } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { deptsQuery, userDetailQuery } from '../api';
import { PermissionTab } from './PermissionTab';
import { ProfileTab } from './ProfileTab';

export function UserDetailPage({
  userId,
  onClose,
}: {
  userId: string | null;
  onClose: () => void;
}): JSX.Element {
  return (
    <Sheet open={!!userId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent>
        {userId && <UserDetailInner userId={userId} />}
      </SheetContent>
    </Sheet>
  );
}

function UserDetailInner({ userId }: { userId: string }) {
  const { t } = useTranslation('admin');
  const { data: user, isPending, isError, refetch } = useQuery(userDetailQuery(userId));
  const { data: depts = [] } = useQuery(deptsQuery);
  const deptById = useMemo(() => new Map(depts.map((dept) => [dept.id, dept])), [depts]);

  if (isError) {
    // 详情请求失败：给出可见错误文案 + 重试入口，避免抽屉永久空白
    return (
      <div role="alert" className="flex flex-col items-center gap-3 px-4 py-10 text-sm text-text-3">
        <span>{t('users.detail.loadFailed')}</span>
        <Button variant="outline" onClick={() => void refetch()}>
          {t('users.detail.retry')}
        </Button>
      </div>
    );
  }
  if (isPending || !user) return <span role="status" className="sr-only" />;

  return (
    <>
      <SheetHeader>
        <SheetTitle>{user.name}</SheetTitle>
      </SheetHeader>
      <Tabs defaultValue="profile" className="px-4 pb-4">
        <TabsList>
          <TabsTrigger value="profile">{t('users.detail.profileTab')}</TabsTrigger>
          <TabsTrigger value="permission">{t('users.detail.permissionTab')}</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <ProfileTab user={user} deptById={deptById} />
        </TabsContent>
        <TabsContent value="permission">
          <PermissionTab />
        </TabsContent>
      </Tabs>
    </>
  );
}
