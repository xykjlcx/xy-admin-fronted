import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupServer } from 'msw/node';
import { ForgotPasswordPage, LoginPage, RegisterPage } from '@/modules/admin/auth';
import { authHandlers } from '@/modules/admin/auth/mocks';
import { i18nInit } from '@/lib/i18n';
import { resetDb } from '@/mocks/db';

const server = setupServer(...authHandlers);
beforeAll(async () => {
  await i18nInit;
  server.listen({ onUnhandledRequest: 'error' });
});
afterEach(() => {
  server.resetHandlers();
  resetDb();
});
afterAll(() => server.close());
function provider(children: React.ReactNode) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

test('注册表单完成校验后创建账号并进入成功状态', async () => {
  const onGoLogin = vi.fn();
  render(provider(<RegisterPage onGoLogin={onGoLogin} />));
  await userEvent.type(screen.getByRole('textbox', { name: '姓名' }), '周测试');
  await userEvent.type(screen.getByRole('textbox', { name: '邮箱' }), 'zhou@example.com');
  await userEvent.type(screen.getByLabelText('密码'), 'Secure123');
  await userEvent.type(screen.getByLabelText('确认密码'), 'Secure123');
  await userEvent.click(screen.getByRole('checkbox', { name: /同意/ }));
  await userEvent.click(screen.getByRole('button', { name: '注册并进入' }));
  expect(await screen.findByText('账号注册成功')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: '前往登录' }));
  expect(onGoLogin).toHaveBeenCalled();
});

test('找回密码提交后展示邮件发送成功状态并可重新发送', async () => {
  render(provider(<ForgotPasswordPage onGoLogin={() => undefined} />));
  await userEvent.type(screen.getByRole('textbox', { name: '注册邮箱' }), 'leah@acme.com');
  await userEvent.click(screen.getByRole('button', { name: '发送重置链接' }));
  expect(await screen.findByText('重置邮件已发送')).toBeInTheDocument();
  expect(screen.getByText(/30 分钟/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '重新发送' })).toBeInTheDocument();
});

test('短信验证码登录形成完整 Mock 会话', async () => {
  const onAuthenticated = vi.fn().mockResolvedValue(undefined);
  render(
    provider(
      <LoginPage
        onAuthenticated={onAuthenticated}
        onGoForgotPassword={vi.fn()}
        onGoRegister={vi.fn()}
      />,
    ),
  );
  await userEvent.click(screen.getByRole('button', { name: '短信验证码' }));
  await userEvent.type(screen.getByRole('textbox', { name: '手机号' }), '13800138000');
  await userEvent.click(screen.getByRole('button', { name: '获取验证码' }));
  expect(await screen.findByText(/123456/)).toBeInTheDocument();
  await userEvent.type(screen.getByRole('textbox', { name: '验证码' }), '123456');
  await userEvent.click(screen.getByRole('button', { name: '登录 ›' }));
  await waitFor(() => expect(onAuthenticated).toHaveBeenCalled());
});

test('扫码页提供可完成的 Mock 确认登录动作', async () => {
  const onAuthenticated = vi.fn().mockResolvedValue(undefined);
  render(
    provider(
      <LoginPage
        onAuthenticated={onAuthenticated}
        onGoForgotPassword={vi.fn()}
        onGoRegister={vi.fn()}
      />,
    ),
  );
  await userEvent.click(screen.getByRole('button', { name: '扫码登录' }));
  await userEvent.click(screen.getByRole('button', { name: '模拟扫码确认' }));
  await waitFor(() => expect(onAuthenticated).toHaveBeenCalled());
});
