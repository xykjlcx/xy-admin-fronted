import { z } from 'zod';
import {
  blobContract,
  defineApiContract,
  defineVoidContract,
  pageResultSchema,
} from '@/lib/http/contract';

test('defineApiContract exposes the response schema as the runtime truth source', () => {
  const schema = z.object({ id: z.string(), name: z.string() });
  const contract = defineApiContract({ response: schema });

  expect(contract.response).toBe(schema);
  expect(contract.responseKind).toBe('json');
});

test('void and blob contracts expose explicit response kinds', () => {
  expect(defineVoidContract()).toMatchObject({ responseKind: 'void' });
  expect(blobContract).toMatchObject({ responseKind: 'blob' });
});

test('pageResultSchema validates backend pagination shape', () => {
  const schema = pageResultSchema(z.object({ id: z.string() }));

  expect(schema.parse({ list: [{ id: 'u1' }], total: 1 })).toEqual({
    list: [{ id: 'u1' }],
    total: 1,
  });
  expect(() => schema.parse({ list: [{ id: 'u1' }], total: '1' })).toThrow();
  expect(() => schema.parse({ rows: [{ id: 'u1' }], total: 1 })).toThrow();
});
