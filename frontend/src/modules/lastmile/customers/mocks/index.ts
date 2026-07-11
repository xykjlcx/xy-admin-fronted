import { http } from 'msw';
import { biz, ok } from '@/mocks/http';
import { CreateCustomerSchema, CustomerAuthorizationSchema, type CustomerDto } from '../api';
import { baseChannels, customerDb } from './db';

export const customerHandlers = [
  http.post('/api/lastmile/customers', async ({ request }) => {
    const parsed = CreateCustomerSchema.safeParse(await request.json());
    if (!parsed.success) return biz({ status: 400, code: 'lastmile.customer.validation.invalid', detail: '客户信息不完整' });
    if (customerDb.all().some((item) => item.code === parsed.data.code)) return biz({ status: 409, code: 'lastmile.customer.code.conflict', detail: '客户编码已存在' });
    const item: CustomerDto = {
      id: crypto.randomUUID(),
      ...parsed.data,
      pricingPlan: '标准价 A',
      balance: 0,
      status: 'trial',
      registeredAt: new Date().toISOString().slice(0, 10),
      channels: baseChannels.map((channel) => ({ ...channel, authorized: false })),
      priceRows: [],
      transactions: [],
    };
    customerDb.add(item);
    return ok(item);
  }),
  http.get('/api/lastmile/customers', ({ request }) => {
    const keyword = (new URL(request.url).searchParams.get('keyword') ?? '').toLowerCase();
    const list = customerDb
      .all()
      .filter(
        (item) => !keyword || [item.name, item.code].some((value) => value.toLowerCase().includes(keyword)),
      );
    return ok({ list, total: list.length });
  }),
  http.patch('/api/lastmile/customers/:id/channels', async ({ params, request }) => {
    const parsed = CustomerAuthorizationSchema.safeParse(await request.json());
    if (!parsed.success) return biz({ status: 400, code: 'lastmile.customer.authorization.invalid', detail: '授权参数不合法' });
    const customer = customerDb.find(String(params.id));
    if (!customer) return biz({ status: 404, code: 'lastmile.customer.not-found', detail: '客户不存在' });
    const next = customerDb.update(customer.id, (item) => ({
      ...item,
      channels: item.channels.map((channel) =>
        channel.id === parsed.data.channelId ? { ...channel, authorized: parsed.data.authorized } : channel,
      ),
    }));
    return ok(next);
  }),
  http.get('/api/lastmile/customers/:id', ({ params }) => {
    const item = customerDb.find(String(params.id));
    return item ? ok(item) : biz({ status: 404, code: 'lastmile.customer.not-found', detail: '客户不存在' });
  }),
];
export { customerDb } from './db';
