import { vi } from 'vitest';
import { downloadFile } from '@/lib/download';

test('通过 fetch 获取文件并使用对象 URL 触发下载', async () => {
  const blob = new Blob(['bill,data'], { type: 'text/csv' });
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(blob));
  const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-download');
  const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

  await expect(downloadFile('/api/export', 'billing.csv')).resolves.toBe(13);

  expect(fetchMock).toHaveBeenCalledWith('/api/export');
  expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
  expect(click).toHaveBeenCalledOnce();
  expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-download');
});
