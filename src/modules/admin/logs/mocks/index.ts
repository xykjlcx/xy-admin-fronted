import { HttpResponse, http } from 'msw';
import { biz, ok } from '@/mocks/http';
import { LoginResultSchema, OperationTypeSchema } from '../api';
import { loginLogs, operationLogs } from './db';

function keywordOf(request: Request) {
  return new URL(request.url).searchParams.get('keyword')?.trim().toLowerCase() ?? '';
}

function matchesDateRange(occurredAt: string, url: URL) {
  const startDate = url.searchParams.get('startDate') ?? '';
  const endDate = url.searchParams.get('endDate') ?? '';
  const date = occurredAt.slice(0, 10);
  return (!startDate || date >= startDate) && (!endDate || date <= endDate);
}

function filterOperations(request: Request) {
  const url = new URL(request.url);
  const type = OperationTypeSchema.safeParse(url.searchParams.get('type') ?? 'all');
  if (!type.success) return null;
  const keyword = keywordOf(request);
  return operationLogs.filter((item) => {
    const matchesType = type.data === 'all' || item.type === type.data;
    const matchesKeyword =
      !keyword ||
      [item.operator, item.module, item.target, item.ip].some((value) =>
        value.toLowerCase().includes(keyword),
      );
    return matchesType && matchesKeyword && matchesDateRange(item.occurredAt, url);
  });
}

function filterLogins(request: Request) {
  const url = new URL(request.url);
  const result = LoginResultSchema.safeParse(url.searchParams.get('result') ?? 'all');
  if (!result.success) return null;
  const keyword = keywordOf(request);
  return loginLogs.filter((item) => {
    const matchesResult = result.data === 'all' || item.result === result.data;
    const matchesKeyword =
      !keyword ||
      [item.user, item.ip, item.location, item.device].some((value) => value.toLowerCase().includes(keyword));
    return matchesResult && matchesKeyword && matchesDateRange(item.occurredAt, url);
  });
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

export const logHandlers = [
  http.get('/api/audit/operation-logs/export', ({ request }) => {
    const list = filterOperations(request);
    if (!list) return biz(4001, '操作类型不合法');
    const rows = list.map((item) =>
      [item.occurredAt, item.operator, item.module, item.type, item.target, item.ip].map(csvCell).join(','),
    );
    const csv = `\ufeff操作时间,操作人,模块,操作类型,操作对象,IP地址\n${rows.join('\n')}`;
    return new HttpResponse(csv, {
      headers: {
        'Content-Type': 'text/csv;charset=utf-8',
        'Content-Disposition': 'attachment; filename="operation-logs.csv"',
      },
    });
  }),
  http.get('/api/audit/login-logs/export', ({ request }) => {
    const list = filterLogins(request);
    if (!list) return biz(4001, '登录结果不合法');
    const rows = list.map((item) =>
      [item.occurredAt, item.user, item.result, item.ip, item.location, item.device].map(csvCell).join(','),
    );
    const csv = `\ufeff登录时间,用户,结果,IP地址,地点,设备\n${rows.join('\n')}`;
    return new HttpResponse(csv, {
      headers: {
        'Content-Type': 'text/csv;charset=utf-8',
        'Content-Disposition': 'attachment; filename="login-logs.csv"',
      },
    });
  }),
  http.get('/api/audit/operation-logs', ({ request }) => {
    const list = filterOperations(request);
    return list ? ok({ list, total: list.length }) : biz(4001, '操作类型不合法');
  }),
  http.get('/api/audit/login-logs', ({ request }) => {
    const list = filterLogins(request);
    return list ? ok({ list, total: list.length }) : biz(4001, '登录结果不合法');
  }),
];

export { loginLogs, operationLogs } from './db';
