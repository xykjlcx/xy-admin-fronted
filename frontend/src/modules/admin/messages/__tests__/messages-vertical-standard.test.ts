import { readFileSync } from 'node:fs';
test('messages index is query-free', () =>
  expect(readFileSync('src/modules/admin/messages/index.tsx', 'utf8')).not.toMatch(/use(Query|Mutation)/));
