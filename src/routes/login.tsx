import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router';
import { Check, Eye, Globe2, Lock, Mail, MessageSquare, Moon, QrCode, ShieldCheck, Smartphone, Sun } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Input,
  InputGroup,
  InputGroupInput,
  InputGroupPrefix,
  InputGroupSuffix,
} from '@/components/ui/input';
import { authApi } from '@/modules/admin/api/auth.api';
import { resetAuth } from '@/lib/reset-auth';
import { cn } from '@/lib/utils';
import { appConfig } from '@/config';
import { useAppearance } from '@/stores/appearance';
import { LOCALE_STORAGE_KEY } from '@/lib/i18n-config';

const searchSchema = z.object({ redirect: z.string().optional() });

// 同源校验：只接受站内绝对路径，挡掉 //evil.com、/\evil.com、http(s):// 等开放重定向注入
function safeInternalPath(to: string | undefined): string {
  if (to && to.startsWith('/') && !to.startsWith('//') && !to.startsWith('/\\')) return to;
  return appConfig.routes.home;
}
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
  const { t, i18n } = useTranslation();
  const { redirect: to } = Route.useSearch();
  const mode = useAppearance((s) => s.mode);
  const setAppearance = useAppearance((s) => s.set);
  const toggleLang = () => {
    const next = i18n.language.startsWith('zh') ? 'en-US' : 'zh-CN';
    void i18n.changeLanguage(next);
    localStorage.setItem(LOCALE_STORAGE_KEY, next);
  };
  const toggleTheme = () => setAppearance({ mode: mode === 'dark' ? 'light' : 'dark' });
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
      // to 来自守卫写入的 pathname+search，可能带 ?query；safeInternalPath 做同源校验防开放重定向
      void nav({ href: safeInternalPath(to) });
    } catch (e) {
      setError('root', { message: (e as Error).message });
    }
  });

  return (
    <main className="fixed inset-0 z-[200] flex bg-surface text-text">
      <HeroPanel />

      <section className="flex min-w-0 flex-1 flex-col overflow-y-auto px-[calc(56px*var(--app-scale))] py-[calc(40px*var(--app-scale))]">
        <div className="flex justify-end gap-6 text-[calc(13px*var(--app-scale))] text-text-2">
          <button type="button" onClick={toggleLang} className="flex items-center gap-1.5 hover:text-text">
            <Globe2 className="size-[calc(15px*var(--app-scale))]" />
            {i18n.language.startsWith('zh') ? 'English' : '简体中文'}
          </button>
          <button type="button" onClick={toggleTheme} className="flex items-center gap-1.5 hover:text-text">
            {mode === 'dark' ? (
              <Sun className="size-[calc(15px*var(--app-scale))]" />
            ) : (
              <Moon className="size-[calc(15px*var(--app-scale))]" />
            )}
            {t('auth.switchTheme')}
          </button>
        </div>

        <form onSubmit={onSubmit} className="my-auto w-full max-w-[calc(420px*var(--app-scale))] self-center">
          <h1 className="ui-page-title text-[calc(30px*var(--app-scale))] font-extrabold leading-tight text-text">
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


              {formState.errors.root && (
                <p className="mt-4 rounded-8 bg-danger-soft px-3 py-2 text-[calc(13px*var(--app-scale))] text-danger">
                  {formState.errors.root.message}
                </p>
              )}

              <Button
                type="submit"
                size="lg"
                block
                className="mt-[calc(26px*var(--app-scale))] h-[calc(48px*var(--app-scale))] rounded-10 text-[calc(15px*var(--app-scale))] shadow-popover"
              >
                {t('auth.login')} ›
              </Button>

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
        <div className="ui-page-title text-[calc(44px*var(--app-scale))] font-extrabold leading-[1.15] text-text">
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
        <label htmlFor="login-username" className="mb-2 block text-[calc(13px*var(--app-scale))] font-medium text-text-2">{t('auth.account')}</label>
        <InputGroup inputSize="lg" className="h-[calc(46px*var(--app-scale))] gap-2.5 rounded-10 px-3.5">
          <InputGroupPrefix>
            <Mail data-icon="inline-start" className="size-[calc(17px*var(--app-scale))] text-text-3" />
          </InputGroupPrefix>
          <InputGroupInput
            id="login-username"
            {...register('username')}
            className="text-sm text-text"
          />
        </InputGroup>
      </div>
      <div className="mt-[calc(18px*var(--app-scale))]">
        <div className="mb-2 flex items-center justify-between">
          <label htmlFor="login-password" className="text-[calc(13px*var(--app-scale))] font-medium text-text-2">{t('auth.password')}</label>
          <button type="button" className="text-[calc(13px*var(--app-scale))] text-pri">{t('auth.forgotPassword')}</button>
        </div>
        <InputGroup inputSize="lg" className="h-[calc(46px*var(--app-scale))] gap-2.5 rounded-10 px-3.5">
          <InputGroupPrefix>
            <Lock data-icon="inline-start" className="size-[calc(17px*var(--app-scale))] text-text-3" />
          </InputGroupPrefix>
          <InputGroupInput
            id="login-password"
            {...register('password')}
            type={showPassword ? 'text' : 'password'}
            className="text-sm text-text"
          />
          <InputGroupSuffix>
            <button
              type="button"
              aria-label={passwordToggleLabel}
              title={passwordToggleLabel}
              onClick={onTogglePassword}
              className="text-text-3 hover:text-text"
            >
              <Eye data-icon="inline-start" className="size-[calc(17px*var(--app-scale))]" />
            </button>
          </InputGroupSuffix>
        </InputGroup>
      </div>
    </>
  );
}

function SmsFields() {
  const { t } = useTranslation();
  return (
    <div className="mt-[calc(26px*var(--app-scale))] grid gap-[calc(18px*var(--app-scale))]">
      <div>
        <label htmlFor="login-phone" className="mb-2 block text-[calc(13px*var(--app-scale))] font-medium text-text-2">{t('auth.phone')}</label>
        <InputGroup inputSize="lg" className="h-[calc(46px*var(--app-scale))] gap-2.5 rounded-10 px-3.5">
          <InputGroupPrefix className="items-center gap-2 text-text-2">
            <span className="text-sm">+86</span>
            <span className="h-[calc(18px*var(--app-scale))] w-px bg-border" />
          </InputGroupPrefix>
          <InputGroupInput
            id="login-phone"
            placeholder={t('auth.phonePlaceholder')}
            className="text-sm text-text"
          />
        </InputGroup>
      </div>
      <div>
        <label htmlFor="login-sms-code" className="mb-2 block text-[calc(13px*var(--app-scale))] font-medium text-text-2">{t('auth.smsCode')}</label>
        <div className="flex gap-2.5">
          <Input
            id="login-sms-code"
            inputSize="lg"
            placeholder={t('auth.smsPlaceholder')}
            className="h-[calc(46px*var(--app-scale))] rounded-10 px-3.5 text-sm"
          />
          <Button type="button" variant="outline" size="lg" className="h-[calc(46px*var(--app-scale))] w-[calc(120px*var(--app-scale))] rounded-10 border-pri text-[calc(13px*var(--app-scale))] text-pri hover:border-pri hover:text-pri">
            {t('auth.getSmsCode')}
          </Button>
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
