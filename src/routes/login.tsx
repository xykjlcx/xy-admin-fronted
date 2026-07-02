import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { authApi } from '@/modules/admin/api/auth.api';
import { useAuth } from '@/stores/auth';

const searchSchema = z.object({ redirect: z.string().optional() });
export const Route = createFileRoute('/login')({
  validateSearch: searchSchema,
  component: LoginPage,
});

function LoginPage() {
  const { t } = useTranslation();
  const { redirect: to } = Route.useSearch();
  const nav = useNavigate();
  const router = useRouter();
  const { register, handleSubmit, setError, formState } = useForm<{
    username: string;
    password: string;
  }>();
  const onSubmit = handleSubmit(async (dto) => {
    try {
      const { token } = await authApi.login(dto);
      useAuth.getState().setToken(token);
      await router.invalidate(); // 关键：登录后 beforeLoad 不会自动重跑（spec §9）
      void nav({ to: to ?? '/admin/dashboard' });
    } catch (e) {
      setError('root', { message: (e as Error).message });
    }
  });
  return (
    <div className="flex h-screen items-center justify-center bg-bg">
      <form onSubmit={onSubmit} className="w-[360px] rounded-lg border border-border bg-surface p-8">
        <h1 className="mb-6 text-[22px] font-semibold text-text">{t('app.name')}</h1>
        <input
          {...register('username')}
          placeholder={t('auth.username')}
          className="mb-3 h-10 w-full rounded-md border border-border bg-surface-2 px-3 text-text"
        />
        <input
          {...register('password')}
          type="password"
          placeholder={t('auth.password')}
          className="mb-4 h-10 w-full rounded-md border border-border bg-surface-2 px-3 text-text"
        />
        {formState.errors.root && (
          <p className="mb-3 text-[12px] text-danger">{formState.errors.root.message}</p>
        )}
        <button className="h-10 w-full rounded-md bg-pri text-white hover:bg-pri-hover">
          {t('auth.login')}
        </button>
      </form>
    </div>
  );
}
