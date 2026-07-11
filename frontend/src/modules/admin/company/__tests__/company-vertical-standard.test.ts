import { readFileSync } from 'node:fs';
test('company index is query-free', () =>
  expect(readFileSync('src/modules/admin/company/index.tsx', 'utf8')).not.toMatch(/use(Query|Mutation)/));
