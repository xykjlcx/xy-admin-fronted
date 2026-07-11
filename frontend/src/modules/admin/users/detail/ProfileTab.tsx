import { useTranslation } from 'react-i18next';
import { DescriptionList } from '@/components/pro/DescriptionList';
import type { DeptDto, UserDetailDto } from '../api';

interface ProfileTabProps {
  user: UserDetailDto;
  deptById: Map<string, DeptDto>;
}

export function ProfileTab({ user, deptById }: ProfileTabProps) {
  const { t } = useTranslation('admin');
  const detailItems = [
    { label: t('users.detail.dept'), value: deptById.get(user.deptId)?.name ?? '-' },
    { label: t('users.detail.role'), value: user.role },
    { label: t('users.detail.contact'), value: user.phone, description: user.email },
    { label: t('users.detail.status'), value: t(`users.status.${user.status}`) },
  ];

  return <DescriptionList items={detailItems} />;
}
