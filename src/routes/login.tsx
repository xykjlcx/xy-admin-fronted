import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router';
import { Check, Eye, Globe2, Lock, Mail, MessageSquare, Moon, QrCode, ShieldCheck, Smartphone } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { authApi } from '@/modules/admin/api/auth.api';
import { resetAuth } from '@/lib/reset-auth';
import { cn } from '@/lib/utils';
import { appConfig } from '@/config';

const searchSchema = z.object({ redirect: z.string().optional() });
export const Route = createFileRoute('/login')({
  validateSearch: searchSchema,
  component: LoginPage,
});

type AuthTab = 'password' | 'sms' | 'qr';

const authTabs = [
  { key: 'password', icon: Lock },
  { key: 'sms', icon: Smartphone },
  { key: 'qr', icon: QrCode },
] as const;

function LoginPage() {
  const { t } = useTranslation();
  const { redirect: to } = Route.useSearch();
  const nav = useNavigate();
  const router = useRouter();
  const [tab, setTab] = useState<AuthTab>('password');
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, setError, formState } = useForm<{
    username: string;
    password: string;
  }>({
    defaultValues: { username: '', password: '' },
  });

  const onSubmit = handleSubmit(async (dto) => {
    if (tab !== 'password') {
      setError('root', { message: t('auth.passwordLoginOnly') });
      return;
    }
    try {
      const { token } = await authApi.login(dto);
      resetAuth(token); // 清上个账号的 me 缓存 + 存新 token，防权限串号
      await router.invalidate(); // 关键：登录后 beforeLoad 不会自动重跑（spec §9）
      // to 来自守卫写入的 location.href，可能带 ?query；用 href 而非 to，避免整串被当 pathname 解析导致 404
      void nav({ href: to ?? appConfig.routes.home });
    } catch (e) {
      setError('root', { message: (e as Error).message });
    }
  });

  return (
    <main className="fixed inset-0 z-[200] flex bg-surface text-text">
      <HeroPanel />

      <section className="flex min-w-0 flex-1 flex-col overflow-y-auto px-[calc(56px*var(--app-scale))] py-[calc(40px*var(--app-scale))]">
        <div className="flex justify-end gap-6 text-[calc(13px*var(--app-scale))] text-text-2">
          <button type="button" className="flex items-center gap-1.5 hover:text-text">
            <Globe2 className="size-[calc(15px*var(--app-scale))]" />
            English
          </button>
          <button type="button" className="flex items-center gap-1.5 hover:text-text">
            <Moon className="size-[calc(15px*var(--app-scale))]" />
            {t('auth.switchTheme')}
          </button>
        </div>

        <form onSubmit={onSubmit} className="my-auto w-full max-w-[calc(420px*var(--app-scale))] self-center">
          <h1 className="text-[calc(30px*var(--app-scale))] font-extrabold leading-tight text-text">
            {t('auth.welcome')}
          </h1>
          <p className="mt-2.5 text-sm text-text-3">{t('auth.welcomeDesc')}</p>

          <div className="mt-7 grid grid-cols-3 gap-1 rounded-10 bg-surface-2 p-1">
            {authTabs.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  className={cn(
                    'flex h-[calc(36px*var(--app-scale))] items-center justify-center gap-1.5 rounded-8 text-[calc(13px*var(--app-scale))] transition-colors',
                    tab === item.key ? 'bg-surface font-semibold text-text shadow-card-sm' : 'text-text-2 hover:text-text',
                  )}
                  onClick={() => setTab(item.key)}
                >
                  <Icon className="size-[calc(15px*var(--app-scale))]" />
                  {t(`auth.tabs.${item.key}`)}
                </button>
              );
            })}
          </div>

          {tab === 'qr' ? (
            <QrPanel />
          ) : (
            <>
              {tab === 'password' ? (
                <PasswordFields register={register} showPassword={showPassword} onTogglePassword={() => setShowPassword((value) => !value)} />
              ) : (
                <SmsFields />
              )}

              <label className="mt-4 flex cursor-pointer items-center gap-2">
                <span className="flex size-4 items-center justify-center rounded-4 bg-pri text-white">
                  <Check className="size-3 stroke-[3px]" />
                </span>
                <span className="text-[calc(13px*var(--app-scale))] text-text-2">{t('auth.remember')}</span>
              </label>

              {formState.errors.root && (
                <p className="mt-4 rounded-8 bg-danger-soft px-3 py-2 text-[calc(13px*var(--app-scale))] text-danger">
                  {formState.errors.root.message}
                </p>
              )}

              <button
                type="submit"
                className="mt-[calc(26px*var(--app-scale))] flex h-[calc(48px*var(--app-scale))] w-full items-center justify-center rounded-10 bg-pri text-[calc(15px*var(--app-scale))] font-semibold text-white shadow-popover hover:bg-pri-hover"
              >
                {t('auth.login')} ›
              </button>

              <div className="my-6 flex items-center gap-3.5">
                <span className="h-px flex-1 bg-border" />
                <span className="text-[calc(12px*var(--app-scale))] text-text-3">{t('auth.enterpriseLogin')}</span>
                <span className="h-px flex-1 bg-border" />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {['SSO', 'Google', 'WeCom'].map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="flex h-[calc(44px*var(--app-scale))] items-center justify-center gap-2 rounded-10 border border-border text-[calc(13px*var(--app-scale))] text-text-2 transition-colors hover:border-pri hover:text-text"
                  >
                    {item === 'WeCom' ? <MessageSquare className="size-4 text-success" /> : item === 'SSO' ? <ShieldCheck className="size-4" /> : <span className="font-bold text-pri">G</span>}
                    {item}
                  </button>
                ))}
              </div>

              <p className="mt-[calc(22px*var(--app-scale))] text-center text-[calc(13px*var(--app-scale))] text-text-3">
                {t('auth.noAccount')} <button type="button" className="font-medium text-pri">{t('auth.register')}</button>
              </p>
            </>
          )}
        </form>
      </section>
    </main>
  );
}

function HeroPanel() {
  const { t } = useTranslation();
  return (
    <section
      className="relative hidden max-w-[calc(640px*var(--app-scale))] flex-col overflow-hidden px-[calc(48px*var(--app-scale))] py-[calc(48px*var(--app-scale))] lg:flex"
      style={{
        width: '44%',
        background:
          'linear-gradient(135deg, color-mix(in srgb, var(--pri) 14%, var(--surface)), var(--surface) 55%, color-mix(in srgb, var(--pri) 6%, var(--surface)))',
      }}
    >
      <div
        className="absolute right-[calc(-40px*var(--app-scale))] top-[calc(-80px*var(--app-scale))] size-[calc(340px*var(--app-scale))] rounded-full blur-[20px]"
        style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--pri) 35%, transparent), transparent 70%)' }}
      />
      <div className="relative flex items-center gap-3">
        <div className="flex size-[calc(40px*var(--app-scale))] items-center justify-center rounded-11 bg-pri text-[calc(18px*var(--app-scale))] font-bold text-white">
          {t('auth.hero.mark')}
        </div>
        <div className="leading-tight">
          <div className="text-base font-bold text-text">{t('auth.hero.brand')}</div>
          <div className="text-xs text-text-3">{t('auth.hero.subtitle')}</div>
        </div>
      </div>

      <div className="relative my-auto">
        <div className="text-[calc(44px*var(--app-scale))] font-extrabold leading-[1.15] text-text">
          {t('auth.hero.headline1')}
          <br />
          <span className="text-pri">{t('auth.hero.headline2')}</span>
        </div>
        <p className="mt-5 max-w-[calc(420px*var(--app-scale))] text-[calc(15px*var(--app-scale))] leading-7 text-text-2">
          {t('auth.hero.desc')}
        </p>
        <div className="mt-8 flex flex-col gap-3.5">
          {['permission', 'business', 'design'].map((key) => (
            <div key={key} className="flex items-center gap-2.5 text-sm text-text-2">
              <Check className="size-[calc(18px*var(--app-scale))] stroke-[2.4px] text-pri" />
              {t(`auth.hero.points.${key}`)}
            </div>
          ))}
        </div>
      </div>

      <div className="relative text-[calc(12px*var(--app-scale))] text-text-3">{t('auth.hero.footer')}</div>
    </section>
  );
}

function PasswordFields({
  register,
  showPassword,
  onTogglePassword,
}: {
  register: ReturnType<typeof useForm<{ username: string; password: string }>>['register'];
  showPassword: boolean;
  onTogglePassword: () => void;
}) {
  const { t } = useTranslation();
  const passwordToggleLabel = showPassword ? t('auth.hidePassword') : t('auth.showPassword');
  return (
    <>
      <div className="mt-[calc(26px*var(--app-scale))]">
        <label className="mb-2 block text-[calc(13px*var(--app-scale))] font-medium text-text-2">{t('auth.account')}</label>
        <div className="flex h-[calc(46px*var(--app-scale))] items-center gap-2.5 rounded-10 border border-border bg-surface px-3.5">
          <Mail className="size-[calc(17px*var(--app-scale))] text-text-3" />
          <input
            {...register('username')}
            className="min-w-0 flex-1 bg-transparent text-sm text-text outline-none"
          />
        </div>
      </div>
      <div className="mt-[calc(18px*var(--app-scale))]">
        <div className="mb-2 flex items-center justify-between">
          <label className="text-[calc(13px*var(--app-scale))] font-medium text-text-2">{t('auth.password')}</label>
          <button type="button" className="text-[calc(13px*var(--app-scale))] text-pri">{t('auth.forgotPassword')}</button>
        </div>
        <div className="flex h-[calc(46px*var(--app-scale))] items-center gap-2.5 rounded-10 border border-border bg-surface px-3.5">
          <Lock className="size-[calc(17px*var(--app-scale))] text-text-3" />
          <input
            {...register('password')}
            type={showPassword ? 'text' : 'password'}
            className="min-w-0 flex-1 bg-transparent text-sm text-text outline-none"
          />
          <button
            type="button"
            aria-label={passwordToggleLabel}
            title={passwordToggleLabel}
            onClick={onTogglePassword}
            className="text-text-3 hover:text-text"
          >
            <Eye className="size-[calc(17px*var(--app-scale))]" />
          </button>
        </div>
      </div>
    </>
  );
}

function SmsFields() {
  const { t } = useTranslation();
  return (
    <div className="mt-[calc(26px*var(--app-scale))] grid gap-[calc(18px*var(--app-scale))]">
      <div>
        <label className="mb-2 block text-[calc(13px*var(--app-scale))] font-medium text-text-2">{t('auth.phone')}</label>
        <div className="flex h-[calc(46px*var(--app-scale))] items-center gap-2.5 rounded-10 border border-border bg-surface px-3.5">
          <span className="text-sm text-text-2">+86</span>
          <span className="h-[calc(18px*var(--app-scale))] w-px bg-border" />
          <input
            placeholder={t('auth.phonePlaceholder')}
            className="min-w-0 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-3"
          />
        </div>
      </div>
      <div>
        <label className="mb-2 block text-[calc(13px*var(--app-scale))] font-medium text-text-2">{t('auth.smsCode')}</label>
        <div className="flex gap-2.5">
          <input
            placeholder={t('auth.smsPlaceholder')}
            className="h-[calc(46px*var(--app-scale))] min-w-0 flex-1 rounded-10 border border-border bg-surface px-3.5 text-sm outline-none"
          />
          <button type="button" className="h-[calc(46px*var(--app-scale))] w-[calc(120px*var(--app-scale))] rounded-10 border border-pri text-[calc(13px*var(--app-scale))] text-pri">
            {t('auth.getSmsCode')}
          </button>
        </div>
      </div>
    </div>
  );
}

function QrPanel() {
  const { t } = useTranslation();
  return (
    <div className="mt-8 flex flex-col items-center gap-3.5">
      <div className="flex size-[calc(180px*var(--app-scale))] items-center justify-center rounded-14 border border-border bg-surface-2">
        <QrCode className="size-[calc(120px*var(--app-scale))] text-text-3" strokeWidth={1.2} />
      </div>
      <div className="text-[calc(13px*var(--app-scale))] text-text-3">{t('auth.qrHint')}</div>
    </div>
  );
}
