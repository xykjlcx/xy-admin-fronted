import type { ReactNode } from 'react';
import { Check, Globe2, Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppearance } from '@/stores/appearance';
import { LOCALE_STORAGE_KEY } from '@/lib/i18n-config';
import { Button } from '@/components/ui/button';

export function AuthPageLayout({ children }: { children: ReactNode }) {
  const { t, i18n } = useTranslation();
  const mode = useAppearance((state) => state.mode);
  const setAppearance = useAppearance((state) => state.set);
  const toggleLanguage = () => {
    const next = i18n.language.startsWith('zh') ? 'en-US' : 'zh-CN';
    void i18n.changeLanguage(next);
    localStorage.setItem(LOCALE_STORAGE_KEY, next);
  };
  return (
    <main className="fixed inset-0 z-[200] flex bg-surface text-text">
      <section className="relative hidden w-[44%] max-w-[calc(640px*var(--app-scale))] flex-col overflow-hidden bg-surface-2 px-[calc(48px*var(--app-scale))] py-[calc(48px*var(--app-scale))] lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-11 bg-(--accent-emphasis) font-bold text-(--button-primary-fg)">
            {t('auth.hero.mark')}
          </div>
          <div>
            <div className="font-bold">{t('auth.hero.brand')}</div>
            <div className="text-xs text-text-3">{t('auth.hero.subtitle')}</div>
          </div>
        </div>
        <div className="my-auto">
          <h2 className="ui-page-title text-[calc(42px*var(--app-scale))] font-extrabold leading-tight">
            {t('auth.hero.headline1')}
            <br />
            <span className="text-(--accent-emphasis)">{t('auth.hero.headline2')}</span>
          </h2>
          <p className="mt-5 text-sm leading-7 text-text-2">{t('auth.hero.desc')}</p>
          <div className="mt-8 grid gap-3">
            {['permission', 'business', 'design'].map((key) => (
              <span key={key} className="flex items-center gap-2 text-sm text-text-2">
                <Check className="size-4 text-(--accent-emphasis)" />
                {t(`auth.hero.points.${key}`)}
              </span>
            ))}
          </div>
        </div>
      </section>
      <section className="flex min-w-0 flex-1 flex-col overflow-y-auto px-[calc(40px*var(--app-scale))] py-[calc(32px*var(--app-scale))]">
        <div className="flex justify-end gap-5 text-sm text-text-2">
          <Button
            type="button"
            variant="text"
            size="xs"
            className="gap-1.5 text-text-2"
            onClick={toggleLanguage}
          >
            <Globe2 data-icon="inline-start" />
            {i18n.language.startsWith('zh') ? 'English' : '简体中文'}
          </Button>
          <Button
            type="button"
            variant="text"
            size="xs"
            className="gap-1.5 text-text-2"
            onClick={() => setAppearance({ mode: mode === 'dark' ? 'light' : 'dark' })}
          >
            {mode === 'dark' ? <Sun data-icon="inline-start" /> : <Moon data-icon="inline-start" />}
            {t('auth.switchTheme')}
          </Button>
        </div>
        <div className="my-auto w-full max-w-[calc(440px*var(--app-scale))] self-center">{children}</div>
      </section>
    </main>
  );
}
