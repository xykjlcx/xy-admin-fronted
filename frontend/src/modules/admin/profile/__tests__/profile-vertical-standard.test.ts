import { readFileSync } from 'node:fs';
test('profile index is query-free', () =>
  expect(readFileSync('src/modules/admin/profile/index.tsx', 'utf8')).not.toMatch(/use(Query|Mutation)/));
