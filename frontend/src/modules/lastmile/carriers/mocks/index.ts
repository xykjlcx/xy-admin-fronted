import { http } from 'msw';
import { biz, ok } from '@/mocks/http';
import { CarrierInputSchema } from '../api';
import { carrierDb } from './db';
export const carrierHandlers = [
  http.post('/api/lastmile/carriers', async ({ request }) => {
    const parsed = CarrierInputSchema.safeParse(await request.json());
    if (!parsed.success) return biz(4001, '承运商信息不完整');
    const id = crypto.randomUUID();
    const item = {
      id,
      code: parsed.data.code,
      name: parsed.data.name,
      fullName: parsed.data.fullName,
      region: parsed.data.region,
      enabled: true,
      services: [
        {
          id: `${id}-srv`,
          name: parsed.data.serviceName,
          code: parsed.data.serviceCode,
          tracking: true,
          labelFormat: 'PDF',
        },
      ],
      channels: [],
    };
    carrierDb.add(item);
    return ok(item);
  }),
  http.get('/api/lastmile/carriers', ({ request }) => {
    const keyword = (new URL(request.url).searchParams.get('keyword') ?? '').toLowerCase();
    const list = carrierDb
      .all()
      .filter(
        (item) =>
          !keyword || [item.name, item.fullName].some((value) => value.toLowerCase().includes(keyword)),
      );
    return ok({ list, total: list.length });
  }),
  http.get('/api/lastmile/carriers/:id', ({ params }) => {
    const item = carrierDb.find(String(params.id));
    return item ? ok(item) : biz(4040, '承运商不存在');
  }),
];
export { carrierDb } from './db';
