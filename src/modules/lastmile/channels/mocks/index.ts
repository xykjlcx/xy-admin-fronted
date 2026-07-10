import { http } from 'msw';
import { biz, ok } from '@/mocks/http';
import {
  ChannelBatchSchema,
  ChannelInputSchema,
  ChannelKindFilterSchema,
  ChannelStatusFilterSchema,
  ChannelToggleSchema,
} from '../api';
import { channelDb } from './db';
const suppliers = [
  {
    value: 'sup-001',
    label: '新智慧',
    carriers: [
      { value: 'car-001', label: 'DHL', services: ['DHL Paket', 'DHL Express'] },
      { value: 'car-002', label: 'DPD', services: ['DPD Classic'] },
    ],
  },
  {
    value: 'sup-002',
    label: '递四方',
    carriers: [{ value: 'car-003', label: 'GLS', services: ['GLS Business'] }],
  },
  {
    value: 'sup-003',
    label: 'DHL 官方',
    carriers: [{ value: 'car-001', label: 'DHL', services: ['DHL Paket'] }],
  },
  {
    value: 'sup-004',
    label: '云途',
    carriers: [{ value: 'car-004', label: 'UPS', services: ['UPS Standard'] }],
  },
  {
    value: 'sup-005',
    label: '顺丰',
    carriers: [{ value: 'car-005', label: '顺丰', services: ['欧洲专递'] }],
  },
  {
    value: 'sup-006',
    label: '自营',
    carriers: [{ value: 'car-006', label: '自营', services: ['自建配送'] }],
  },
];
function list(request: Request) {
  const url = new URL(request.url);
  const keyword = (url.searchParams.get('keyword') ?? '').toLowerCase();
  const kind = ChannelKindFilterSchema.safeParse(url.searchParams.get('kind') ?? 'all');
  const status = ChannelStatusFilterSchema.safeParse(url.searchParams.get('status') ?? 'all');
  if (!kind.success || !status.success) return null;
  return channelDb
    .all()
    .filter(
      (item) =>
        (kind.data === 'all' || item.kind === kind.data) &&
        (status.data === 'all' || item.enabled === (status.data === 'enabled')) &&
        (!keyword ||
          [item.name, item.code, item.supplier].some((value) => value.toLowerCase().includes(keyword))),
    );
}
function fromInput(
  input: ReturnType<typeof ChannelInputSchema.parse>,
  current?: ReturnType<typeof channelDb.find>,
) {
  const supplier = suppliers.find((item) => item.value === input.supplierId);
  const carrier = supplier?.carriers.find((item) => item.value === input.carrierId);
  if (!supplier || !carrier) return null;
  return {
    id: current?.id ?? crypto.randomUUID(),
    code: input.code,
    name: input.name,
    kind: input.kind,
    supplierId: supplier.value,
    supplier: supplier.label,
    carrierId: carrier.value,
    carrier: carrier.label,
    service: input.service,
    countries: input.countries,
    accountOwner: input.accountOwner,
    settlement: input.settlement,
    cost: current?.cost ?? 0,
    price: current?.price ?? 0,
    priority: input.priority,
    enabled: current?.enabled ?? true,
    updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    api: {
      baseUrl: input.baseUrl,
      productCode: input.code.replaceAll('-', '_'),
      accountNo: '987654321',
      labelFormat: input.labelFormat,
      tracking: true,
      latency: current?.api.latency ?? 0,
    },
    regions: current?.regions ?? [],
    quotes: current?.quotes ?? [],
    logs: current?.logs ?? [],
  };
}

function result(items = channelDb.all()) {
  const all = channelDb.all();
  return {
    list: items,
    total: items.length,
    stats: {
      total: all.length,
      enabled: all.filter((item) => item.enabled).length,
      countries: new Set(all.flatMap((item) => item.countries)).size,
      today: 8462,
      successRate: 99.28,
    },
  };
}
export const channelHandlers = [
  http.get('/api/lastmile/channel-options', () =>
    ok({
      suppliers,
      countries: [
        { value: 'DE', label: '德国 DE' },
        { value: 'FR', label: '法国 FR' },
        { value: 'GB', label: '英国 GB' },
        { value: 'NL', label: '荷兰 NL' },
        { value: 'US', label: '美国 US' },
      ],
    }),
  ),
  http.get('/api/lastmile/channels', ({ request }) => {
    const items = list(request);
    return items ? ok(result(items)) : biz(4001, '筛选条件不合法');
  }),
  http.post('/api/lastmile/channels', async ({ request }) => {
    const parsed = ChannelInputSchema.safeParse(await request.json());
    if (!parsed.success) return biz(4001, '渠道信息不完整');
    if (channelDb.all().some((item) => item.code === parsed.data.code)) return biz(4090, '渠道编码已存在');
    const item = fromInput(parsed.data);
    if (!item) return biz(4004, '供应商或承运商不存在');
    channelDb.add(item);
    return ok(item);
  }),
  http.post('/api/lastmile/channels/batch-enable', async ({ request }) => {
    const parsed = ChannelBatchSchema.safeParse(await request.json());
    if (!parsed.success) return biz(4001, '请选择渠道');
    for (const id of parsed.data.ids) channelDb.update(id, (item) => ({ ...item, enabled: true }));
    return ok(result());
  }),
  http.put('/api/lastmile/channels/:id', async ({ params, request }) => {
    const parsed = ChannelInputSchema.safeParse(await request.json());
    const current = channelDb.find(String(params.id));
    if (!parsed.success) return biz(4001, '渠道信息不完整');
    if (!current) return biz(4040, '渠道不存在');
    const item = fromInput(parsed.data, current);
    if (!item) return biz(4004, '供应商或承运商不存在');
    channelDb.update(current.id, () => item);
    return ok(item);
  }),
  http.patch('/api/lastmile/channels/:id/status', async ({ params, request }) => {
    const parsed = ChannelToggleSchema.safeParse(await request.json());
    const current = channelDb.find(String(params.id));
    if (!parsed.success) return biz(4001, '状态不合法');
    if (!current) return biz(4040, '渠道不存在');
    return ok(channelDb.update(current.id, (item) => ({ ...item, enabled: parsed.data.enabled })));
  }),
  http.post('/api/lastmile/channels/:id/test', ({ params }) =>
    channelDb.find(String(params.id))
      ? ok({ ok: true, latency: 286, testedAt: new Date().toISOString() })
      : biz(4040, '渠道不存在'),
  ),
  http.get('/api/lastmile/channels/:id', ({ params }) => {
    const item = channelDb.find(String(params.id));
    return item ? ok(item) : biz(4040, '渠道不存在');
  }),
];
export { channelDb } from './db';
