import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { ErrorScreen } from '@/components/pro/ErrorScreen';
import { appConfig } from '@/config';

// 放在 _auth 外层，可独立访问；页面级守卫无权限时 beforeLoad throw redirect 到这里
export const Route = createFileRoute('/403')({
  component: ForbiddenRoute,
});

function ForbiddenRoute() {
  const { t } = useTranslation();

  return (
    <ErrorScreen
      code="403"
      title={t('errors.403')}
      backHomeLabel={t('errors.backHome')}
      homeTo={appConfig.routes.home}
    />
  );
}
