import { readFileSync } from 'node:fs';
test('auth index is query-free', () =>
  expect(readFileSync('src/modules/admin/auth/index.tsx', 'utf8')).not.toMatch(/use(Query|Mutation)/));
