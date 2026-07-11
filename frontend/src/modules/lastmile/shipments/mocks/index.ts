import { HttpResponse, http } from 'msw';
import { biz, ok } from '@/mocks/http';
import {
  CreateShipmentSchema,
  PrintShipmentInputSchema,
  ShipmentFilterSchema,
  ShipmentListSchema,
  type ShipmentDto,
} from '../api';
import { shipmentDb } from './db';

const customers = [
  { value: 'c-001', label: '德坤海外仓' },
  { value: 'c-002', label: '深圳跨境优选' },
  { value: 'c-003', label: '欧凯家居' },
  { value: 'c-004', label: '跨境小马哥' },
];
const channels = [
  { value: 'ch-001', label: 'DPD Classic' },
  { value: 'ch-002', label: 'DHL Paket' },
  { value: 'ch-003', label: 'GLS Business' },
  { value: 'ch-005', label: '自营尾程 EU' },
];

function list(request: Request) {
  const url = new URL(request.url);
  const keyword = (url.searchParams.get('keyword') ?? '').trim().toLowerCase();
  const status = ShipmentFilterSchema.safeParse(url.searchParams.get('status') ?? 'all');
  if (!status.success) return null;
  return shipmentDb
    .all()
    .filter(
      (item) =>
        (status.data === 'all' || item.status === status.data) &&
        (!keyword ||
          [item.no, item.customer, item.trackingNo].some((value) => value.toLowerCase().includes(keyword))),
    );
}

function result(items = shipmentDb.all()) {
  const stats = { pending: 0, printed: 0, transit: 0, delivered: 0, exception: 0, returned: 0 };
  for (const item of shipmentDb.all()) stats[item.status] += 1;
  return { list: items, total: items.length, stats };
}

export const shipmentHandlers = [
  http.get('/api/lastmile/shipment-options', () =>
    ok({
      customers,
      channels,
      countries: [
        { value: '德国 DE', label: '德国 DE' },
        { value: '法国 FR', label: '法国 FR' },
        { value: '荷兰 NL', label: '荷兰 NL' },
        { value: '英国 GB', label: '英国 GB' },
      ],
      warehouses: [
        { value: '深圳坂田保税仓', label: '深圳坂田保税仓' },
        { value: '义乌保税仓', label: '义乌保税仓' },
      ],
    }),
  ),
  http.get('/api/lastmile/shipments/export', ({ request }) => {
    const items = list(request);
    if (!items) return biz(4001, '状态不合法');
    const rows = items.map((item) =>
      [
        item.no,
        item.customer,
        item.country,
        item.channel,
        item.weight,
        item.fee,
        item.trackingNo,
        item.status,
      ]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(','),
    );
    return new HttpResponse(`\ufeff运单号,客户,目的国,渠道,重量,运费,跟踪号,状态\n${rows.join('\n')}`, {
      headers: {
        'Content-Type': 'text/csv;charset=utf-8',
        'Content-Disposition': 'attachment; filename="shipments.csv"',
      },
    });
  }),
  http.post('/api/lastmile/shipments/batch-print', () => {
    for (const item of shipmentDb.all().filter((entry) => entry.status === 'pending'))
      shipmentDb.update(item.id, (entry) => ({
        ...entry,
        status: 'printed',
        trackingNo: `MOCK${entry.no.slice(-8)}`,
      }));
    return ok(ShipmentListSchema.parse(result()));
  }),
  http.post('/api/lastmile/shipments', async ({ request }) => {
    const input = CreateShipmentSchema.safeParse(await request.json());
    if (!input.success) return biz(4001, '运单信息不完整');
    const customer = customers.find((item) => item.value === input.data.customerId);
    const channel = channels.find((item) => item.value === input.data.channelId);
    if (!customer || !channel) return biz(4004, '客户或渠道不存在');
    const id = crypto.randomUUID();
    const fee = Math.round(input.data.parcels.reduce((sum, parcel) => sum + parcel.weight * 24, 38));
    const createdAt = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const item: ShipmentDto = {
      id,
      no: `MM${Date.now().toString().slice(-8)}`,
      customerId: customer.value,
      customer: customer.label,
      country: input.data.country,
      channelId: channel.value,
      channel: channel.label,
      weight: input.data.parcels.reduce((sum, parcel) => sum + parcel.weight, 0),
      fee,
      status: 'pending',
      trackingNo: '—',
      createdAt,
      warehouse: input.data.warehouse,
      sender: {
        name: customer.label,
        phone: '+86 138 0000 1234',
        country: '中国 CN',
        postalCode: '518000',
        address: input.data.warehouse,
      },
      receiver: {
        name: input.data.recipient,
        phone: input.data.phone,
        country: input.data.country,
        postalCode: input.data.postalCode,
        address: input.data.address,
      },
      parcels: input.data.parcels.map((parcel) => ({ ...parcel, id: crypto.randomUUID() })),
      services: input.data.services,
      feeItems: [
        { label: '基础运费', amount: fee - 9 },
        { label: '燃油附加费', amount: 6 },
        { label: '挂号费', amount: 3 },
      ],
      tracking: [
        {
          id: crypto.randomUUID(),
          title: '订单创建',
          place: input.data.warehouse,
          occurredAt: createdAt,
          completed: true,
          current: true,
        },
      ],
    };
    shipmentDb.add(item);
    return ok(item);
  }),
  http.get('/api/lastmile/shipments', ({ request }) => {
    const items = list(request);
    return items ? ok(result(items)) : biz(4001, '状态不合法');
  }),
  http.post('/api/lastmile/shipments/:id/print', async ({ params, request }) => {
    const input = PrintShipmentInputSchema.safeParse(await request.json());
    if (!input.success) return biz(4001, '打印参数不合法');
    const current = shipmentDb.find(String(params.id));
    if (!current) return biz(4040, '运单不存在');
    const next = shipmentDb.update(current.id, (item) => ({
      ...item,
      status: 'printed',
      trackingNo: item.trackingNo === '—' ? `MOCK${item.no.slice(-8)}` : item.trackingNo,
    }));
    return ok({ shipment: next, printedAt: new Date().toISOString() });
  }),
  http.get('/api/lastmile/shipments/:id/label', ({ params }) =>
    shipmentDb.find(String(params.id))
      ? new HttpResponse('%PDF-1.4\n% Mock shipping label\n', {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="label-${String(params.id)}.pdf"`,
          },
        })
      : biz(4040, '运单不存在'),
  ),
  http.get('/api/lastmile/shipments/:id', ({ params }) => {
    const item = shipmentDb.find(String(params.id));
    return item ? ok(item) : biz(4040, '运单不存在');
  }),
];

export { shipmentDb } from './db';
