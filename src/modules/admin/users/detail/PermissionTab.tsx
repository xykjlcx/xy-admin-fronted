import { useTranslation } from 'react-i18next';

export function PermissionTab() {
  const { t } = useTranslation('admin');

  // SPEC-QUESTION: 权限 tab 数据源待定
  return (
    <div className="mt-6 rounded-8 border border-(--table-border) bg-(--table-bg) px-4 py-6 text-sm text-text-3">
      {t('users.detail.permissionPending')}
    </div>
  );
}
