import { z } from 'zod';
import { defineApiContract, pageResultSchema } from '@/lib/http/contract';

test('defineApiContract exposes the response schema as the runtime truth source', () => {
  const schema = z.object({ id: z.string(), name: z.string() });
  const contract = defineApiContract({ response: schema });

  expect(contract.response).toBe(schema);
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
