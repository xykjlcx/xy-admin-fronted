import { biz, noContent, ok } from '@/mocks/http';

test('ok 直接返回 JSON 成功数据', async () => {
  const response = ok({ id: 'u1' });

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ id: 'u1' });
});

test('noContent 返回无 body 的 204', async () => {
  const response = noContent();

  expect(response.status).toBe(204);
  expect(await response.text()).toBe('');
});

test('biz 返回 RFC 9457 ProblemDetail 且保留字段不可覆盖', async () => {
  const response = biz({
    status: 404,
    code: 'iam.user.not-found',
    detail: '成员不存在',
    extensions: { resourceId: 'u404', status: 200, code: 'bad.override' },
  });

  expect(response.status).toBe(404);
  expect(response.headers.get('Content-Type')).toContain('application/problem+json');
  expect(await response.json()).toMatchObject({
    type: 'about:blank',
    title: 'Not Found',
    status: 404,
    detail: '成员不存在',
    code: 'iam.user.not-found',
    resourceId: 'u404',
    traceId: expect.any(String),
  });
});
