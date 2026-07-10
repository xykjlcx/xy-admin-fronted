import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import { toast } from 'sonner';
import { FilesPage } from '@/modules/admin/files';
import { fileHandlers } from '@/modules/admin/files/mocks';
import { i18nInit } from '@/lib/i18n';
import { platform } from '@/lib/platform';
import { resetDb } from '@/mocks/db';

const server = setupServer(...fileHandlers);
beforeAll(async () => {
  await i18nInit;
  server.listen({ onUnhandledRequest: 'error' });
});
afterEach(() => {
  server.resetHandlers();
  resetDb();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

function renderPage(permissions = ['*:*:*']) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <FilesPage permissions={permissions} />
    </QueryClientProvider>,
  );
}

function renderControlledPage(fileId?: string, onFileChange = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <FilesPage permissions={['*:*:*']} fileId={fileId} onFileChange={onFileChange} />
    </QueryClientProvider>,
  );
  return onFileChange;
}

test('文件页支持目录浏览、搜索和视图切换', async () => {
  renderPage();
  expect(await screen.findByText('财务报表')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: '打开文件夹 财务报表' }));
  expect(await screen.findByText('Q2财报.pdf')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: '全部文件' }));
  await userEvent.type(screen.getByRole('searchbox', { name: '搜索文件' }), '组织架构');
  expect(await screen.findByText('组织架构图.png')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: '列表视图' }));
  expect(await screen.findByRole('table')).toBeInTheDocument();
});

test('可通过上传对话框添加文件并打开预览', async () => {
  renderPage();
  await screen.findByText('财务报表');
  await userEvent.click(screen.getByRole('button', { name: '上传文件' }));
  const file = new File(['content'], '供应商清单.xlsx', { type: 'application/vnd.ms-excel' });
  await userEvent.upload(screen.getByLabelText('选择文件'), file);
  await userEvent.click(screen.getByRole('button', { name: '开始上传' }));

  await userEvent.click(await screen.findByRole('button', { name: '预览 供应商清单.xlsx' }));
  expect(await screen.findByRole('dialog', { name: '供应商清单.xlsx' })).toBeInTheDocument();
});

test('只读权限隐藏写操作和文件管理操作', async () => {
  renderPage(['file:doc:view']);
  await screen.findByText('财务报表');
  expect(screen.queryByRole('button', { name: '上传文件' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '新建文件夹' })).not.toBeInTheDocument();
});

test('上传对话框拒绝超过 100MB 的文件', async () => {
  renderPage();
  await screen.findByText('财务报表');
  await userEvent.click(screen.getByRole('button', { name: '上传文件' }));
  const file = new File(['content'], 'oversized.zip', { type: 'application/zip' });
  Object.defineProperty(file, 'size', { value: 100 * 1024 * 1024 + 1 });

  await userEvent.upload(screen.getByLabelText('选择文件'), file);

  expect(await screen.findByRole('alert')).toHaveTextContent('单个文件不能超过 100MB');
  expect(screen.getByRole('button', { name: '开始上传' })).toBeDisabled();
});

test('下载失败时给出可见反馈且不产生未处理拒绝', async () => {
  const errorToast = vi.spyOn(toast, 'error').mockImplementation(() => 'download-error');
  server.use(
    http.get('/api/files/:id/download', () =>
      HttpResponse.json({ code: 5000, message: 'download unavailable', data: null }, { status: 503 }),
    ),
  );
  renderPage();
  await userEvent.click(await screen.findByRole('button', { name: '预览 组织架构图.png' }));
  await userEvent.click(await screen.findByRole('button', { name: '下载' }));

  await waitFor(() => expect(errorToast).toHaveBeenCalled());
});

test('分享文件复制可回读深链，直接进入深链会自动打开文件预览', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  const onFileChange = renderControlledPage();
  await userEvent.click(await screen.findByRole('button', { name: '预览 组织架构图.png' }));
  const sharedFileId = onFileChange.mock.lastCall?.[0];
  expect(sharedFileId).toEqual(expect.any(String));
  if (!sharedFileId) throw new Error('shared file id is missing');

  cleanup();
  renderControlledPage(sharedFileId);
  await userEvent.click(await screen.findByRole('button', { name: '分享' }));
  await waitFor(() =>
    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}/admin/files?fileId=${encodeURIComponent(sharedFileId)}`,
    ),
  );
});

test('下载任务显示进度并可按 task id 取消', async () => {
  const taskId = '9ba560a3-94c6-438a-9d76-1e17627fd483';
  let listener: Parameters<typeof platform.files.subscribe>[0] | undefined;
  vi.spyOn(platform.files, 'subscribe').mockImplementation((next) => {
    listener = next;
    return () => undefined;
  });
  const save = vi.spyOn(platform.files, 'save').mockResolvedValue({ taskId });
  const cancel = vi.spyOn(platform.files, 'cancel').mockResolvedValue(undefined);

  renderPage();
  await userEvent.click(await screen.findByRole('button', { name: '预览 组织架构图.png' }));
  await userEvent.click(await screen.findByRole('button', { name: '下载' }));
  await waitFor(() =>
    expect(save).toHaveBeenCalledWith({ resourceId: expect.any(String), suggestedName: '组织架构图.png' }),
  );

  act(() => listener?.({ taskId, status: 'progress', receivedBytes: 50, totalBytes: 100, percent: 50 }));
  expect(screen.getByRole('progressbar', { name: '下载进度' })).toHaveAttribute('aria-valuenow', '50');
  await userEvent.click(screen.getByRole('button', { name: '取消下载' }));
  expect(cancel).toHaveBeenCalledWith(taskId);
});

test('保存框等待期间保持 single-flight，不重复创建下载任务', async () => {
  let resolveSave: ((value: { taskId: string }) => void) | undefined;
  const save = vi.spyOn(platform.files, 'save').mockReturnValue(
    new Promise((resolve) => {
      resolveSave = resolve;
    }),
  );
  vi.spyOn(platform.files, 'subscribe').mockReturnValue(() => undefined);

  renderPage();
  await userEvent.click(await screen.findByRole('button', { name: '预览 组织架构图.png' }));
  const downloadButton = await screen.findByRole('button', { name: '下载' });
  await userEvent.click(downloadButton);
  await userEvent.click(downloadButton);
  expect(save).toHaveBeenCalledTimes(1);
  act(() => resolveSave?.({ taskId: '9ba560a3-94c6-438a-9d76-1e17627fd483' }));
});
