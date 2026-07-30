import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { registrationApi, RegisterSchema } from '../api';
import { AuthPageLayout } from '../components/AuthPageLayout';

export function RegisterScene({ onGoLogin }: { onGoLogin: () => void }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', agree: false });
  const [error, setError] = useState('');
  const [registeredEmail, setRegisteredEmail] = useState('');
  const register = useMutation({
    mutationFn: registrationApi.register,
    onSuccess: (data) => setRegisteredEmail(data.email),
    onError: (reason) => setError(reason instanceof Error ? reason.message : t('auth.registerPage.failed')),
  });
  const valid = RegisterSchema.safeParse(form).success && form.password === form.confirmPassword;
  const patch = (key: keyof typeof form, value: string | boolean) =>
    setForm((current) => ({ ...current, [key]: value }));
  if (registeredEmail)
    return (
      <AuthPageLayout>
        <div className="text-center">
          <CheckCircle2 className="mx-auto size-10 text-success" />
          <h1 className="mt-4 text-xl font-bold">{t('auth.registerPage.success')}</h1>
          <p className="mt-2 text-sm text-text-3">
            {t('auth.registerPage.successDesc', { email: registeredEmail })}
          </p>
          <Button block className="mt-5" onClick={onGoLogin}>
            {t('auth.registerPage.goLogin')}
          </Button>
        </div>
      </AuthPageLayout>
    );
  return (
    <AuthPageLayout>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!valid) return;
          setError('');
          register.mutate({ name: form.name, email: form.email, password: form.password, agree: true });
        }}
      >
        <h1 className="ui-page-title text-2xl font-bold">{t('auth.registerPage.title')}</h1>
        <p className="mt-2 text-sm text-text-3">{t('auth.registerPage.desc')}</p>
        <div className="mt-5 grid gap-3">
          {(['name', 'email'] as const).map((key) => (
            <Field key={key}>
              <FieldLabel htmlFor={`register-${key}`} required>
                {t(`auth.registerPage.${key}`)}
              </FieldLabel>
              <Input
                id={`register-${key}`}
                type={key === 'email' ? 'email' : 'text'}
                aria-label={t(`auth.registerPage.${key}`)}
                value={form[key]}
                onChange={(event) => patch(key, event.currentTarget.value)}
              />
            </Field>
          ))}
          {(['password', 'confirmPassword'] as const).map((key) => (
            <Field key={key}>
              <FieldLabel htmlFor={`register-${key}`} required>
                {t(`auth.registerPage.${key}`)}
              </FieldLabel>
              <Input
                id={`register-${key}`}
                type="password"
                aria-label={t(`auth.registerPage.${key}`)}
                value={form[key]}
                onChange={(event) => patch(key, event.currentTarget.value)}
              />
            </Field>
          ))}
          <label className="flex items-start gap-2 text-sm text-text-2">
            <Checkbox
              aria-label={t('auth.registerPage.agree')}
              checked={form.agree}
              onCheckedChange={(checked) => patch('agree', checked)}
            />
            <span>{t('auth.registerPage.agree')}</span>
          </label>
          {error && <FieldError role="alert">{error}</FieldError>}
          <Button type="submit" block disabled={!valid} loading={register.isPending}>
            {t('auth.registerPage.submit')}
          </Button>
          <p className="text-center text-sm text-text-3">
            {t('auth.registerPage.hasAccount')}{' '}
            <Button type="button" variant="link" size="xs" onClick={onGoLogin}>
              {t('auth.login')}
            </Button>
          </p>
        </div>
      </form>
    </AuthPageLayout>
  );
}
