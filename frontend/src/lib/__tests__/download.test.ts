import { vi } from 'vitest';
import { downloadFile } from '@/lib/download';
import { BizError } from '@/lib/http/errors';

afterEach(() => {
  vi.restoreAllMocks();
});

test('通过统一 request core 获取文件，服务端 filename 优先并触发下载', async () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response('bill,data', {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="server.csv"',
      },
    }),
  );
  const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-download');
  const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  let clickedFilename = '';
  const click = vi
    .spyOn(HTMLAnchorElement.prototype, 'click')
    .mockImplementation(function (this: HTMLAnchorElement) {
      clickedFilename = this.download;
    });

  await downloadFile('/api/export', 'billing.csv');

  expect(fetchMock).toHaveBeenCalledWith(
    '/api/export',
    expect.objectContaining({ method: 'GET', credentials: 'same-origin' }),
  );
  expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
  expect(click).toHaveBeenCalledOnce();
  expect(clickedFilename).toBe('server.csv');
  expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-download');
});

test.each([
  [
    'ProblemDetail',
    () =>
      Response.json(
        { status: 403, code: 'auth.permission.denied', detail: 'forbidden' },
        { status: 403, headers: { 'Content-Type': 'application/problem+json' } },
      ),
  ],
  [
    'HTML proxy error',
    () =>
      new Response('<html><body>bad gateway</body></html>', {
        status: 502,
        headers: { 'Content-Type': 'text/html' },
      }),
  ],
])('blob %s response is rejected before object URL creation', async (_label, createResponse) => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () => createResponse());
  const createObjectURL = vi.spyOn(URL, 'createObjectURL');

  await expect(downloadFile('/api/export-error', 'fallback.csv')).rejects.toBeInstanceOf(BizError);
  expect(createObjectURL).not.toHaveBeenCalled();
});
