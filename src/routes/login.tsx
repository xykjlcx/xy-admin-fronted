import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { authApi } from '@/modules/admin/api/auth.api';
import { resetAuth } from '@/lib/reset-auth';

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
      resetAuth(token); // 清上个账号的 me 缓存 + 存新 token，防权限串号
      await router.invalidate(); // 关键：登录后 beforeLoad 不会自动重跑（spec §9）
      // to 来自守卫写入的 location.href，可能带 ?query；用 href 而非 to，避免整串被当 pathname 解析导致 404
      void nav({ href: to ?? '/admin/dashboard' });
    } catch (e) {
      setError('root', { message: (e as Error).message });
    }
  });
  return (
    <div className="flex h-screen items-center justify-center bg-bg">
      <form onSubmit={onSubmit} className="w-[calc(360px*var(--app-scale))] rounded-lg border border-border bg-surface p-8">
        <h1 className="mb-6 text-[calc(22px*var(--app-scale))] font-semibold text-text">{t('app.name')}</h1>
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
          <p className="mb-3 text-[calc(12px*var(--app-scale))] text-danger">{formState.errors.root.message}</p>
        )}
        <button className="h-10 w-full rounded-md bg-pri text-white hover:bg-pri-hover">
          {t('auth.login')}
        </button>
      </form>
    </div>
  );
}
