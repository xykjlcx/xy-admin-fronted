import { HttpResponse, http } from 'msw';
import { biz, ok } from '@/mocks/http';
import { genId } from '@/mocks/db';
import { CreateFileSchema, CreateFolderSchema, RenameFileSchema, type FileKind } from '../api';
import { files } from './db';

function fileKind(name: string, mimeType: string): FileKind {
  const extension = name.split('.').pop()?.toLowerCase();
  if (mimeType.startsWith('image/')) return 'image';
  if (extension === 'pdf') return 'pdf';
  if (['doc', 'docx'].includes(extension ?? '')) return 'doc';
  if (['xls', 'xlsx', 'csv'].includes(extension ?? '')) return 'sheet';
  if (['ppt', 'pptx'].includes(extension ?? '')) return 'ppt';
  if (['zip', 'rar', '7z'].includes(extension ?? '')) return 'zip';
  return 'other';
}

function recount() {
  for (const entry of files.all())
    if (entry.kind === 'folder')
      entry.childCount = files.filter((child) => child.parentId === entry.id).length;
}

function removeTree(id: string) {
  for (const child of files.filter((entry) => entry.parentId === id)) removeTree(child.id);
  files.remove(id);
}

export const fileHandlers = [
  http.get('/api/files/storage', () =>
    ok({
      used: 10.2,
      total: 15,
      segments: [
        { kind: 'document', percent: 52 },
        { kind: 'image', percent: 24 },
        { kind: 'video', percent: 12 },
        { kind: 'other', percent: 12 },
      ],
    }),
  ),
  http.get('/api/files/:id/download', ({ params }) => {
    const entry = files.find(String(params.id));
    if (!entry || entry.kind === 'folder') return biz(4040, '文件不存在');
    return new HttpResponse(`Mock file content: ${entry.name}`, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(entry.name)}"`,
      },
    });
  }),
  http.get('/api/files', ({ request }) => {
    recount();
    const url = new URL(request.url);
    const parentId = url.searchParams.get('parentId');
    const keyword = url.searchParams.get('keyword')?.trim().toLowerCase() ?? '';
    const list = files.filter((entry) =>
      keyword
        ? entry.name.toLowerCase().includes(keyword)
        : entry.parentId === (parentId === 'root' ? null : parentId),
    );
    return ok({ list, total: list.length });
  }),
  http.get('/api/files/:id', ({ params }) => {
    const entry = files.find(String(params.id));
    return entry ? ok(entry) : biz(4040, '文件不存在');
  }),
  http.post('/api/files/folders', async ({ request }) => {
    const parsed = CreateFolderSchema.safeParse(await request.json());
    if (!parsed.success) return biz(4001, '文件夹名称不能为空');
    const entry = files.insert({
      id: genId('created-folder'),
      name: parsed.data.name,
      kind: 'folder',
      mimeType: '',
      size: null,
      owner: '李长昕',
      updatedAt: '2026-07-10',
      parentId: parsed.data.parentId,
      childCount: 0,
    });
    recount();
    return ok(entry);
  }),
  http.post('/api/files', async ({ request }) => {
    const parsed = CreateFileSchema.safeParse(await request.json());
    if (!parsed.success) return biz(4001, '文件信息不完整');
    const entry = files.insert({
      id: genId('uploaded-file'),
      ...parsed.data,
      kind: fileKind(parsed.data.name, parsed.data.mimeType),
      owner: '李长昕',
      updatedAt: '2026-07-10',
      childCount: 0,
    });
    recount();
    return ok(entry);
  }),
  http.patch('/api/files/:id', async ({ params, request }) => {
    const id = String(params.id);
    if (!files.find(id)) return biz(4040, '文件不存在');
    const parsed = RenameFileSchema.safeParse(await request.json());
    if (!parsed.success) return biz(4001, '文件名不能为空');
    return ok(files.update(id, parsed.data));
  }),
  http.delete('/api/files/:id', ({ params }) => {
    const id = String(params.id);
    if (!files.find(id)) return biz(4040, '文件不存在');
    removeTree(id);
    recount();
    return ok(null);
  }),
];

export { files } from './db';
