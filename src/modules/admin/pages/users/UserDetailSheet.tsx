import { useTranslation } from 'react-i18next';
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

  return (
    <Sheet open={!!user} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{user?.name ?? t('users.dialog.detailFallback')}</SheetTitle>
        </SheetHeader>
        {user && (
          <dl className="mt-6 grid gap-4 text-sm">
            <div>
              <dt className="text-text-3">{t('users.detail.dept')}</dt>
              <dd className="mt-1 text-text">{deptById.get(user.deptId)?.name ?? '-'}</dd>
            </div>
            <div>
              <dt className="text-text-3">{t('users.detail.role')}</dt>
              <dd className="mt-1 text-text">{user.role}</dd>
            </div>
            <div>
              <dt className="text-text-3">{t('users.detail.contact')}</dt>
              <dd className="mt-1 text-text">{user.phone}</dd>
              <dd className="mt-1 text-text-2">{user.email}</dd>
            </div>
            <div>
              <dt className="text-text-3">{t('users.detail.status')}</dt>
              <dd className="mt-1 text-text">{t(`users.status.${user.status}`)}</dd>
            </div>
          </dl>
        )}
      </SheetContent>
    </Sheet>
  );
}
