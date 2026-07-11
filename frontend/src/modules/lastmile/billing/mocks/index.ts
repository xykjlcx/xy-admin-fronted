import { HttpResponse, http } from 'msw';
import { biz, ok } from '@/mocks/http';
import { BillFilterSchema } from '../api';
import { bills } from './db';
function filter(request: Request) {
  const url = new URL(request.url);
  const keyword = (url.searchParams.get('keyword') ?? '').toLowerCase();
  const status = BillFilterSchema.safeParse(url.searchParams.get('status') ?? 'all');
  if (!status.success) return null;
  return bills.filter(
    (item) =>
      (status.data === 'all' || item.status === status.data) &&
      (!keyword || [item.no, item.customer].some((value) => value.toLowerCase().includes(keyword))),
  );
}
export const billingHandlers = [
  http.get('/api/lastmile/billing/export', ({ request }) => {
    const list = filter(request);
    if (!list) return biz({ status: 400, code: 'lastmile.billing.status.invalid', detail: '状态不合法' });
    const rows = list.map((item) =>
      [item.no, item.customer, item.period, item.shipments, item.amount, item.status]
        .map((value) => `"${value}"`)
        .join(','),
    );
    return new HttpResponse(`\ufeff账单号,客户,账期,运单数,应收金额,状态\n${rows.join('\n')}`, {
      headers: {
        'Content-Type': 'text/csv;charset=utf-8',
        'Content-Disposition': 'attachment; filename="billing.csv"',
      },
    });
  }),
  http.get('/api/lastmile/billing', ({ request }) => {
    const list = filter(request);
    return list
      ? ok({
          list,
          total: list.length,
          receivable: list
            .filter((item) => item.status !== 'paid')
            .reduce((sum, item) => sum + item.amount, 0),
        })
      : biz({ status: 400, code: 'lastmile.billing.status.invalid', detail: '状态不合法' });
  }),
];
