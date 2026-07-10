import { createFileRoute } from '@tanstack/react-router';
import { ForgotPasswordPage } from '@/modules/admin/auth';

export const Route = createFileRoute('/forgot-password')({ component: ForgotPasswordRoute });

function ForgotPasswordRoute() {
  const navigate = Route.useNavigate();
  return <ForgotPasswordPage onGoLogin={() => void navigate({ to: '/login' })} />;
}
