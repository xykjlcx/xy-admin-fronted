import { http } from 'msw';
import { biz, ok } from '@/mocks/http';
import { SupplierInputSchema } from '../api';
import { supplierDb } from './db';
export const supplierHandlers = [
  http.post('/api/lastmile/suppliers', async ({ request }) => {
    const parsed = SupplierInputSchema.safeParse(await request.json());
    if (!parsed.success) return biz(4001, '供应商信息不完整');
    const id = crypto.randomUUID();
    const carriers = parsed.data.carriers
      .split(/[·,，]/)
      .map((item) => item.trim())
      .filter(Boolean);
    const item = {
      id,
      ...parsed.data,
      carriers,
      authType: 'API Key + Secret',
      enabled: true,
      latency: 0,
      mappings: carriers.map((carrier, index) => ({
        id: `${id}-map-${index}`,
        carrier,
        product: `${carrier} 产品线`,
        services: '标准',
        tracking: true,
      })),
      channels: [],
    };
    supplierDb.add(item);
    return ok(item);
  }),
  http.get('/api/lastmile/suppliers', ({ request }) => {
    const keyword = (new URL(request.url).searchParams.get('keyword') ?? '').toLowerCase();
    const list = supplierDb
      .all()
      .filter(
        (item) => !keyword || [item.name, item.code].some((value) => value.toLowerCase().includes(keyword)),
      );
    return ok({ list, total: list.length });
  }),
  http.get('/api/lastmile/suppliers/:id', ({ params }) => {
    const item = supplierDb.find(String(params.id));
    return item ? ok(item) : biz(4040, '供应商不存在');
  }),
];
export { supplierDb } from './db';
