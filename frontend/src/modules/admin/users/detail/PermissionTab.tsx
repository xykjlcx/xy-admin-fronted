import { useTranslation } from 'react-i18next';

export function PermissionTab() {
  const { t } = useTranslation('admin');

  // SPEC-QUESTION: 权限 tab 数据源待定
  return (
    <div className="mt-3 rounded-8 border border-(--table-border) bg-(--table-bg) px-3 py-4 text-sm text-text-3">
      {t('users.detail.permissionPending')}
    </div>
  );
}
