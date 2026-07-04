import { useTranslation } from 'react-i18next';
import { DescriptionList } from '@/components/pro/DescriptionList';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { DeptDto, UserDto } from '@/modules/admin/api/user.api';

export function UserDetailSheet({
  user,
  deptById,
  onOpenChange,
}: {
  user: UserDto | null;
  deptById: Map<string, DeptDto>;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation('admin');
  const detailItems = user
    ? [
        { label: t('users.detail.dept'), value: deptById.get(user.deptId)?.name ?? '-' },
        { label: t('users.detail.role'), value: user.role },
        { label: t('users.detail.contact'), value: user.phone, description: user.email },
        { label: t('users.detail.status'), value: t(`users.status.${user.status}`) },
      ]
    : [];

  return (
    <Sheet open={!!user} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{user?.name ?? t('users.dialog.detailFallback')}</SheetTitle>
        </SheetHeader>
        {user && <DescriptionList items={detailItems} />}
      </SheetContent>
    </Sheet>
  );
}
