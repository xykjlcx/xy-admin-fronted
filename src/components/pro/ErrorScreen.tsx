import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { appConfig } from '@/config';

// 全局 403/404 用配置路由回首页，避免错误页硬编码路径后和 appConfig 漂移。
export function ErrorScreen({ code }: { code: '403' | '404' }) {
  const { t } = useTranslation();
  return (
    <div className="flex h-full min-h-[calc(400px*var(--app-scale))] flex-col items-center justify-center gap-3">
      <div className="text-[calc(64px*var(--app-scale))] font-bold text-text-3">{code}</div>
      <p className="text-text-2">{t(`errors.${code}`)}</p>
      <Link to={appConfig.routes.home} className="text-pri">
        {t('errors.backHome')}
      </Link>
    </div>
  );
}
