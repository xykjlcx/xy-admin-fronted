import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ErrorScreen } from '@/components/pro/ErrorScreen';
import { appConfig } from '@/config';

export interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: Outlet,
  notFoundComponent: NotFoundRoute,
});

function NotFoundRoute() {
  const { t } = useTranslation();

  return (
    <ErrorScreen
      code="404"
      title={t('errors.404')}
      backHomeLabel={t('errors.backHome')}
      homeTo={appConfig.routes.home}
    />
  );
}
