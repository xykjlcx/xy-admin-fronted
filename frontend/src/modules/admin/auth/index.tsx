import { ForgotPasswordScene } from './form/ForgotPasswordScene';
import { RegisterScene } from './form/RegisterScene';
import { LoginScene } from './list/LoginScene';
export function LoginPage(props: React.ComponentProps<typeof LoginScene>) {
  return <LoginScene {...props} />;
}
export function RegisterPage({ onGoLogin }: { onGoLogin: () => void }) {
  return <RegisterScene onGoLogin={onGoLogin} />;
}
export function ForgotPasswordPage({ onGoLogin }: { onGoLogin: () => void }) {
  return <ForgotPasswordScene onGoLogin={onGoLogin} />;
}
