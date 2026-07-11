import { readFileSync } from 'node:fs';
test('logs index is query-free', () =>
  expect(readFileSync('src/modules/admin/logs/index.tsx', 'utf8')).not.toMatch(/use(Query|Mutation)/));
