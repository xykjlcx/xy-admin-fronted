import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';

export function ErrorScreen({ code }: { code: '403' | '404' }) {
  const { t } = useTranslation();
  return (
    <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-3">
      <div className="text-[64px] font-bold text-text-3">{code}</div>
      <p className="text-text-2">{t(`errors.${code}`)}</p>
      <Link to="/admin/dashboard" className="text-pri">
        {t('errors.backHome')}
      </Link>
    </div>
  );
}
