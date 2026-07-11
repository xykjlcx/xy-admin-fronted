import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const projectRoot = resolve(__dirname, '../../../../..');

test('dictionaries index remains a query-free UI skeleton', () => {
  const source = readFileSync(resolve(projectRoot, 'src/modules/admin/dictionaries/index.tsx'), 'utf8');
  expect(source).not.toMatch(/use(Query|SuspenseQuery|Mutation|QueryClient)\b/);
});
