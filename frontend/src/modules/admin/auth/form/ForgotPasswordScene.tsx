import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { MailCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ForgotPasswordSchema, registrationApi } from '../api';
import { AuthPageLayout } from '../components/AuthPageLayout';

export function ForgotPasswordScene({ onGoLogin }: { onGoLogin: () => void }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState<{ email: string; expiresInMinutes: number }>();
  const request = useMutation({
    mutationFn: registrationApi.forgotPassword,
    onSuccess: setSent,
    onError: (reason) => setError(reason instanceof Error ? reason.message : t('auth.forgotPage.failed')),
  });
  const valid = ForgotPasswordSchema.safeParse({ email }).success;
  const submit = () => {
    if (!valid) return;
    setError('');
    request.mutate({ email });
  };
  if (sent)
    return (
      <AuthPageLayout>
        <div className="text-center">
          <MailCheck className="mx-auto size-14 text-success" />
          <h1 className="mt-5 text-2xl font-bold">{t('auth.forgotPage.success')}</h1>
          <p className="mt-2 text-sm leading-6 text-text-3">{t('auth.forgotPage.successDesc', sent)}</p>
          <div className="mt-7 grid gap-3">
            <Button
              block
              onClick={() => {
                setSent(undefined);
                submit();
              }}
              loading={request.isPending}
            >
              {t('auth.forgotPage.resend')}
            </Button>
            <Button block variant="outline" onClick={onGoLogin}>
              {t('auth.forgotPage.backLogin')}
            </Button>
          </div>
        </div>
      </AuthPageLayout>
    );
  return (
    <AuthPageLayout>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <h1 className="ui-page-title text-3xl font-extrabold">{t('auth.forgotPage.title')}</h1>
        <p className="mt-2 text-sm text-text-3">{t('auth.forgotPage.desc')}</p>
        <div className="mt-7 grid gap-4">
          <Field>
            <FieldLabel htmlFor="forgot-email" required>
              {t('auth.forgotPage.email')}
            </FieldLabel>
            <Input
              id="forgot-email"
              type="email"
              aria-label={t('auth.forgotPage.email')}
              value={email}
              onChange={(event) => setEmail(event.currentTarget.value)}
            />
          </Field>
          {error && <FieldError role="alert">{error}</FieldError>}
          <Button type="submit" block size="lg" disabled={!valid} loading={request.isPending}>
            {t('auth.forgotPage.submit')}
          </Button>
          <Button type="button" variant="link" onClick={onGoLogin}>
            {t('auth.forgotPage.backLogin')}
          </Button>
        </div>
      </form>
    </AuthPageLayout>
  );
}
