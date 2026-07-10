import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import { CompanyPage } from '@/modules/admin/company';
import { companyHandlers } from '@/modules/admin/company/mocks';
import { i18nInit } from '@/lib/i18n';
import { resetDb } from '@/mocks/db';

const server = setupServer(...companyHandlers);
beforeAll(async () => {
  await i18nInit;
  server.listen({ onUnhandledRequest: 'error' });
});
afterEach(() => {
  server.resetHandlers();
  resetDb();
});
afterAll(() => server.close());

function renderPage(permissions = ['*:*:*']) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <CompanyPage permissions={permissions} />
    </QueryClientProvider>,
  );
}

test('企业页展示基础信息、更多信息与联系人', async () => {
  renderPage();
  expect(await screen.findByText('小倪科技')).toBeInTheDocument();
  expect(screen.getByText('FM4BG629BGE')).toBeInTheDocument();
  expect(screen.getByText('lichangxin@xinyue.com')).toBeInTheDocument();
  expect(screen.getByText('中国大陆')).toBeInTheDocument();
});

test('有编辑权限时可修改企业资料并即时回显', async () => {
  renderPage();
  await screen.findByText('小倪科技');
  await userEvent.click(screen.getByRole('button', { name: '编辑企业信息' }));
  const name = screen.getByRole('textbox', { name: '企业名称' });
  await userEvent.clear(name);
  await userEvent.type(name, '昕越科技');
  await userEvent.click(screen.getByRole('button', { name: '保存企业信息' }));
  expect(await screen.findByText('昕越科技')).toBeInTheDocument();
});

test('只读权限不展示编辑入口', async () => {
  renderPage(['sys:org:view']);
  await screen.findByText('小倪科技');
  expect(screen.queryByRole('button', { name: '编辑企业信息' })).not.toBeInTheDocument();
});

test('企业信息请求失败时展示明确错误和重试入口', async () => {
  server.use(http.get('/api/company', () => HttpResponse.json({ message: 'unavailable' }, { status: 503 })));
  renderPage();

  expect(await screen.findByRole('alert')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '重试' })).toBeInTheDocument();
});
