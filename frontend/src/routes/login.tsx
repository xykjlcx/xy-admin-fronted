import { createFileRoute, useRouter } from '@tanstack/react-router';
import { z } from 'zod';
import { LoginPage } from '@/modules/admin/auth';

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute('/login')({
  validateSearch: searchSchema,
  component: LoginRoute,
});

function LoginRoute() {
  const { redirect } = Route.useSearch();
  const navigate = Route.useNavigate();
  const router = useRouter();
  return (
    <LoginPage
      redirect={redirect}
      onAuthenticated={async (_token, target) => {
        await router.invalidate();
        await navigate({ href: target });
      }}
      onGoForgotPassword={() => void navigate({ to: '/forgot-password' })}
      onGoRegister={() => void navigate({ to: '/register' })}
    />
  );
}
