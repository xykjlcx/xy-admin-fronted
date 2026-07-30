import {
  Check,
  Eye,
  Globe2,
  Lock,
  Mail,
  MessageSquare,
  Moon,
  QrCode,
  ShieldCheck,
  Smartphone,
  Sun,
} from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Input,
  InputGroup,
  InputGroupInput,
  InputGroupPrefix,
  InputGroupSuffix,
} from '@/components/ui/input';
import { authApi } from '../api';
import { resetSession } from '@/lib/reset-auth';
import { BizError, HttpError } from '@/lib/http/errors';
import { cn } from '@/lib/utils';
import { appConfig } from '@/config';
import { useAppearance } from '@/stores/appearance';
import { LOCALE_STORAGE_KEY } from '@/lib/i18n-config';

// 同源校验：只接受站内绝对路径，挡掉 //evil.com、/\evil.com、http(s):// 等开放重定向注入
function safeInternalPath(to: string | undefined): string {
  if (to && to.startsWith('/') && !to.startsWith('//') && !to.startsWith('/\\')) return to;
  return appConfig.routes.home;
}

type AuthTab = 'password' | 'sms' | 'qr';

const authTabs = [
  { key: 'password', icon: Lock },
  { key: 'sms', icon: Smartphone },
  { key: 'qr', icon: QrCode },
] as const;

export function LoginScene({
  redirect,
  onAuthenticated,
  onGoForgotPassword,
  onGoRegister,
}: {
  redirect?: string;
  onAuthenticated: (token: string, redirect: string) => Promise<void>;
  onGoForgotPassword: () => void;
  onGoRegister: () => void;
}) {
  const { t, i18n } = useTranslation();
  const mode = useAppearance((s) => s.mode);
  const setAppearance = useAppearance((s) => s.set);
  const toggleLang = () => {
    const next = i18n.language.startsWith('zh') ? 'en-US' : 'zh-CN';
    void i18n.changeLanguage(next);
    localStorage.setItem(LOCALE_STORAGE_KEY, next);
  };
  const toggleTheme = () => setAppearance({ mode: mode === 'dark' ? 'light' : 'dark' });
  const [tab, setTab] = useState<AuthTab>('password');
  const [showPassword, setShowPassword] = useState(false);
  const [sms, setSms] = useState({ phone: '', code: '' });
  const [smsHint, setSmsHint] = useState('');
  const { register, handleSubmit, setError, clearErrors, formState } = useForm<{
    username: string;
    password: string;
  }>({
    defaultValues: { username: '', password: '' },
  });

  const completeAuthentication = async (token: string, refreshToken: string) => {
    await resetSession(token, refreshToken); // 存新会话 + 清空上个账号全部缓存，防权限/数据串号
    await onAuthenticated(token, safeInternalPath(redirect));
  };
  const showAuthenticationError = (error: unknown) => {
    if ((error instanceof HttpError || error instanceof BizError) && error.status === 401) {
      const trace = error instanceof BizError && error.traceId ? ` · ${t('auth.traceId')}: ${error.traceId}` : '';
      setError('root', { message: `${t('auth.invalidCredentials')}${trace}` });
    } else {
      setError('root', { message: error instanceof Error ? error.message : t('auth.invalidCredentials') });
    }
  };

  const sendSmsCode = useMutation({
    mutationFn: () => authApi.sendSmsCode({ phone: sms.phone }),
    onSuccess: ({ expiresInSeconds }) => {
      clearErrors('root');
      setSmsHint(t('auth.smsMockHint', { code: '123456', seconds: expiresInSeconds }));
    },
    onError: showAuthenticationError,
  });
  const confirmQrLogin = useMutation({
    mutationFn: authApi.qrLogin,
    onSuccess: ({ token, refreshToken }) => completeAuthentication(token, refreshToken),
    onError: showAuthenticationError,
  });

  // 未接通的企业入口统一走表单提示条反馈，不留无反馈的死按钮。
  const onStubEntry = () => setError('root', { message: t('auth.stubEntry') });

  const onSubmit = handleSubmit(async (dto) => {
    try {
      const { token, refreshToken } =
        tab === 'sms' ? await authApi.smsLogin(sms) : await authApi.login(dto);
      await completeAuthentication(token, refreshToken);
    } catch (e) {
      showAuthenticationError(e);
    }
  });

  return (
    <main className="fixed inset-0 z-[200] flex bg-surface text-text">
      <HeroPanel />

      <section className="flex min-w-0 flex-1 flex-col overflow-y-auto px-[calc(56px*var(--app-scale))] py-[calc(40px*var(--app-scale))]">
        <div className="flex justify-end gap-6 text-[calc(13px*var(--app-scale))] text-text-2">
          <Button type="button" variant="text" size="xs" onClick={toggleLang} className="gap-1.5 text-text-2">
            <Globe2 data-icon="inline-start" />
            {i18n.language.startsWith('zh') ? 'English' : '简体中文'}
          </Button>
          <Button type="button" variant="text" size="xs" onClick={toggleTheme} className="gap-1.5 text-text-2">
            {mode === 'dark' ? (
              <Sun data-icon="inline-start" />
            ) : (
              <Moon data-icon="inline-start" />
            )}
            {t('auth.switchTheme')}
          </Button>
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
                <Button
                  key={item.key}
                  type="button"
                  variant={tab === item.key ? 'secondary' : 'text'}
                  size="sm"
                  className={cn(
                    'h-[calc(36px*var(--app-scale))] gap-1.5 rounded-8 text-[calc(13px*var(--app-scale))]',
                    tab === item.key
                      ? 'font-semibold'
                      : 'text-text-2',
                  )}
                  onClick={() => {
                    clearErrors('root');
                    setTab(item.key);
                  }}
                >
                  <Icon data-icon="inline-start" />
                  {t(`auth.tabs.${item.key}`)}
                </Button>
              );
            })}
          </div>

          {tab === 'qr' ? (
            <QrPanel loading={confirmQrLogin.isPending} onConfirm={() => confirmQrLogin.mutate()} />
          ) : tab === 'password' ? (
            <PasswordFields
              register={register}
              showPassword={showPassword}
              onTogglePassword={() => setShowPassword((value) => !value)}
              onForgotPassword={onGoForgotPassword}
            />
          ) : (
            <SmsFields
              value={sms}
              hint={smsHint}
              sending={sendSmsCode.isPending}
              onChange={(next) => setSms((current) => ({ ...current, ...next }))}
              onSend={() => sendSmsCode.mutate()}
            />
          )}

          {formState.errors.root && (
            <p className="mt-4 rounded-8 bg-danger-soft px-3 py-2 text-[calc(13px*var(--app-scale))] text-danger">
              {formState.errors.root.message}
            </p>
          )}

          {tab !== 'qr' && (
            <>
              <Button
                type="submit"
                size="lg"
                block
                disabled={tab === 'sms' && (sms.phone.length !== 11 || sms.code.length !== 6)}
                loading={formState.isSubmitting}
                className="mt-[calc(26px*var(--app-scale))] h-[calc(48px*var(--app-scale))] rounded-10 text-[calc(15px*var(--app-scale))] shadow-popover"
              >
                {t('auth.login')} ›
              </Button>

              <div className="my-6 flex items-center gap-3.5">
                <span className="h-px flex-1 bg-border" />
                <span className="text-[calc(12px*var(--app-scale))] text-text-3">
                  {t('auth.enterpriseLogin')}
                </span>
                <span className="h-px flex-1 bg-border" />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {['SSO', 'Google', 'WeCom'].map((item) => (
                  <Button
                    key={item}
                    type="button"
                    variant="outline"
                    size="lg"
                    className="h-[calc(44px*var(--app-scale))] gap-2 rounded-10 text-[calc(13px*var(--app-scale))]"
                    onClick={onStubEntry}
                  >
                    {item === 'WeCom' ? (
                      <MessageSquare className="size-4 text-success" />
                    ) : item === 'SSO' ? (
                      <ShieldCheck className="size-4" />
                    ) : (
                      <span className="font-bold text-(--accent-emphasis)">G</span>
                    )}
                    {item}
                  </Button>
                ))}
              </div>

              <p className="mt-[calc(22px*var(--app-scale))] text-center text-[calc(13px*var(--app-scale))] text-text-3">
                {t('auth.noAccount')}{' '}
                <Button type="button" variant="link" size="xs" className="font-medium" onClick={onGoRegister}>
                  {t('auth.register')}
                </Button>
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
      className="ui-auth-hero relative hidden w-[44%] max-w-[calc(640px*var(--app-scale))] flex-col overflow-hidden px-[calc(48px*var(--app-scale))] py-[calc(48px*var(--app-scale))] lg:flex"
    >
      <div
        className="ui-auth-hero-glow absolute right-[calc(-40px*var(--app-scale))] top-[calc(-80px*var(--app-scale))] size-[calc(340px*var(--app-scale))] rounded-full blur-[20px]"
      />
      <div className="relative flex items-center gap-3">
        <div className="flex size-[calc(40px*var(--app-scale))] items-center justify-center rounded-11 bg-(--accent-emphasis) text-[calc(18px*var(--app-scale))] font-bold text-white">
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
          <span className="text-(--accent-emphasis)">{t('auth.hero.headline2')}</span>
        </div>
        <p className="mt-5 max-w-[calc(420px*var(--app-scale))] text-[calc(15px*var(--app-scale))] leading-7 text-text-2">
          {t('auth.hero.desc')}
        </p>
        <div className="mt-8 flex flex-col gap-3.5">
          {['permission', 'business', 'design'].map((key) => (
            <div key={key} className="flex items-center gap-2.5 text-sm text-text-2">
              <Check className="size-[calc(18px*var(--app-scale))] stroke-[2.4px] text-(--accent-emphasis)" />
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
  onForgotPassword,
}: {
  register: ReturnType<typeof useForm<{ username: string; password: string }>>['register'];
  showPassword: boolean;
  onTogglePassword: () => void;
  onForgotPassword: () => void;
}) {
  const { t } = useTranslation();
  const passwordToggleLabel = showPassword ? t('auth.hidePassword') : t('auth.showPassword');
  return (
    <>
      <div className="mt-[calc(26px*var(--app-scale))]">
        <label
          htmlFor="login-username"
          className="mb-2 block text-[calc(13px*var(--app-scale))] font-medium text-text-2"
        >
          {t('auth.account')}
        </label>
        <InputGroup inputSize="lg" className="h-[calc(46px*var(--app-scale))] gap-2.5 rounded-10 px-3.5">
          <InputGroupPrefix>
            <Mail data-icon="inline-start" className="size-[calc(17px*var(--app-scale))] text-text-3" />
          </InputGroupPrefix>
          <InputGroupInput id="login-username" {...register('username')} className="text-sm text-text" />
        </InputGroup>
      </div>
      {/* 忘记密码在 DOM 上排在密码输入之后，Tab 才会从账号直达密码；视觉位置靠绝对定位留在标签行右侧。 */}
      <div className="relative mt-[calc(18px*var(--app-scale))]">
        <div className="mb-2 flex h-[calc(24px*var(--app-scale))] items-center">
          <label
            htmlFor="login-password"
            className="text-[calc(13px*var(--app-scale))] font-medium text-text-2"
          >
            {t('auth.password')}
          </label>
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
            <Button
              type="button"
              aria-label={passwordToggleLabel}
              title={passwordToggleLabel}
              onClick={onTogglePassword}
              variant="ghost"
              size="icon-xs"
            >
              <Eye data-icon="inline-start" className="size-[calc(17px*var(--app-scale))]" />
            </Button>
          </InputGroupSuffix>
        </InputGroup>
        <Button
          type="button"
          variant="link"
          size="xs"
          className="absolute right-0 top-0 text-[calc(13px*var(--app-scale))]"
          onClick={onForgotPassword}
        >
          {t('auth.forgotPassword')}
        </Button>
      </div>
    </>
  );
}

function SmsFields({
  value,
  hint,
  sending,
  onChange,
  onSend,
}: {
  value: { phone: string; code: string };
  hint: string;
  sending: boolean;
  onChange: (next: Partial<{ phone: string; code: string }>) => void;
  onSend: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="mt-[calc(26px*var(--app-scale))] grid gap-[calc(18px*var(--app-scale))]">
      <div>
        <label
          htmlFor="login-phone"
          className="mb-2 block text-[calc(13px*var(--app-scale))] font-medium text-text-2"
        >
          {t('auth.phone')}
        </label>
        <InputGroup inputSize="lg" className="h-[calc(46px*var(--app-scale))] gap-2.5 rounded-10 px-3.5">
          <InputGroupPrefix className="items-center gap-2 text-text-2">
            <span className="text-sm">+86</span>
            <span className="h-[calc(18px*var(--app-scale))] w-px bg-border" />
          </InputGroupPrefix>
          <InputGroupInput
            id="login-phone"
            value={value.phone}
            onChange={(event) => onChange({ phone: event.target.value })}
            placeholder={t('auth.phonePlaceholder')}
            className="text-sm text-text"
          />
        </InputGroup>
      </div>
      <div>
        <label
          htmlFor="login-sms-code"
          className="mb-2 block text-[calc(13px*var(--app-scale))] font-medium text-text-2"
        >
          {t('auth.smsCode')}
        </label>
        <div className="flex gap-2.5">
          <Input
            id="login-sms-code"
            value={value.code}
            onChange={(event) => onChange({ code: event.target.value })}
            inputSize="lg"
            placeholder={t('auth.smsPlaceholder')}
            className="h-[calc(46px*var(--app-scale))] rounded-10 px-3.5 text-sm"
          />
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-[calc(46px*var(--app-scale))] w-[calc(120px*var(--app-scale))] rounded-10 border-(--accent-emphasis) text-[calc(13px*var(--app-scale))] text-(--accent-emphasis) hover:border-(--accent-emphasis) hover:text-(--accent-emphasis)"
            disabled={value.phone.length !== 11}
            loading={sending}
            onClick={onSend}
          >
            {t('auth.getSmsCode')}
          </Button>
        </div>
        {hint && <p className="mt-2 text-[calc(12px*var(--app-scale))] text-text-3">{hint}</p>}
      </div>
    </div>
  );
}

function QrPanel({ loading, onConfirm }: { loading: boolean; onConfirm: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="mt-8 flex flex-col items-center gap-3.5">
      <div className="flex size-[calc(180px*var(--app-scale))] items-center justify-center rounded-14 border border-border bg-surface-2">
        <QrCode className="size-[calc(120px*var(--app-scale))] text-text-3" strokeWidth={1.2} />
      </div>
      <div className="text-[calc(13px*var(--app-scale))] text-text-3">{t('auth.qrHint')}</div>
      <Button type="button" variant="outline" loading={loading} onClick={onConfirm}>
        {t('auth.qrMockConfirm')}
      </Button>
    </div>
  );
}
