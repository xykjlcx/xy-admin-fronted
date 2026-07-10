import { readFileSync } from 'node:fs';
test('files index is query-free', () =>
  expect(readFileSync('src/modules/admin/files/index.tsx', 'utf8')).not.toMatch(/use(Query|Mutation)/));
