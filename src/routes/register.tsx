import { createFileRoute } from '@tanstack/react-router';
import { RegisterPage } from '@/modules/admin/auth';

export const Route = createFileRoute('/register')({ component: RegisterRoute });

function RegisterRoute() {
  const navigate = Route.useNavigate();
  return <RegisterPage onGoLogin={() => void navigate({ to: '/login' })} />;
}
