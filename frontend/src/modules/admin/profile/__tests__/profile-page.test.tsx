import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupServer } from 'msw/node';
import { ProfilePage } from '@/modules/admin/profile';
import { profileHandlers } from '@/modules/admin/profile/mocks';
import { i18nInit } from '@/lib/i18n';
import { resetDb } from '@/mocks/db';

const server = setupServer(...profileHandlers);
beforeAll(async () => {
  await i18nInit;
  server.listen({ onUnhandledRequest: 'error' });
});
afterEach(() => {
  server.resetHandlers();
  resetDb();
});
afterAll(() => server.close());
function renderPage(initialTab: 'info' | 'security' | 'preferences' | 'devices' = 'info') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <ProfilePage permissions={['*:*:*']} initialTab={initialTab} />
    </QueryClientProvider>,
  );
}

test('个人信息展示完整资料并支持编辑', async () => {
  renderPage();
  expect((await screen.findAllByText('李长昕')).length).toBeGreaterThan(0);
  expect(screen.getByText('E-00142')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: '编辑资料' }));
  const title = screen.getByRole('textbox', { name: '职位' });
  await userEvent.clear(title);
  await userEvent.type(title, '产品负责人');
  await userEvent.click(screen.getByRole('button', { name: '保存资料' }));
  expect(await screen.findByText('产品负责人')).toBeInTheDocument();
});

test('账号安全开关可保存并可打开修改密码表单', async () => {
  renderPage('security');
  const newDevice = await screen.findByRole('switch', { name: '新设备登录提醒' });
  expect(newDevice).not.toBeChecked();
  await userEvent.click(newDevice);
  expect(await screen.findByRole('switch', { name: '新设备登录提醒' })).toBeChecked();
  const passwordButtons = screen.getAllByRole('button', { name: '修改密码' });
  const passwordButton = passwordButtons.at(-1);
  if (!passwordButton) throw new Error('change password button missing');
  await userEvent.click(passwordButton);
  expect(screen.getByRole('textbox', { name: '当前密码' })).toBeInTheDocument();
});

test('登录设备页可下线非当前设备', async () => {
  renderPage('devices');
  expect(await screen.findByText(/Chrome · macOS/)).toBeInTheDocument();
  const buttons = await screen.findAllByRole('button', { name: '下线设备' });
  const button = buttons[0];
  if (!button) throw new Error('removable device missing');
  await userEvent.click(button);
  expect(await screen.findByText('设备已下线')).toBeInTheDocument();
});

test('修改密码失败时保留表单并展示服务端错误', async () => {
  renderPage('security');
  await screen.findByRole('switch', { name: '新设备登录提醒' });
  const passwordButton = screen.getAllByRole('button', { name: '修改密码' }).at(-1);
  if (!passwordButton) throw new Error('change password button missing');
  await userEvent.click(passwordButton);
  await userEvent.type(screen.getByRole('textbox', { name: '当前密码' }), 'wrong');
  await userEvent.type(screen.getByRole('textbox', { name: '新密码' }), 'newPassword123');
  await userEvent.type(screen.getByRole('textbox', { name: '确认新密码' }), 'newPassword123');
  await userEvent.click(screen.getByRole('button', { name: '确认修改' }));
  expect(await screen.findByText('当前密码错误')).toBeInTheDocument();
  expect(screen.getByRole('dialog', { name: '修改密码' })).toBeInTheDocument();
});
