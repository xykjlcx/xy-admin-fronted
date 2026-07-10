import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const projectRoot = resolve(__dirname, '../../../../..');
const rolesRoot = resolve(projectRoot, 'src/modules/admin/roles');

function read(path: string) {
  return readFileSync(resolve(projectRoot, path), 'utf8');
}

test('roles index is a UI skeleton and data orchestration lives in a scene', () => {
  const source = read('src/modules/admin/roles/index.tsx');

  expect(source).not.toMatch(/use(Query|SuspenseQuery|Mutation|QueryClient)\b/);
  expect(existsSync(resolve(rolesRoot, 'list/RolesScene.tsx'))).toBe(true);
});

test('roles vertical module owns schema, keys and resettable mock db', () => {
  for (const path of ['api/schema.ts', 'api/keys.ts', 'mocks/db.ts', 'mocks/index.ts']) {
    expect(existsSync(resolve(rolesRoot, path)), `roles/${path} should exist`).toBe(true);
  }
});

test('roles no longer depends on legacy horizontal role files', () => {
  expect(existsSync(resolve(projectRoot, 'src/modules/admin/api/role.api.ts'))).toBe(false);
  expect(existsSync(resolve(projectRoot, 'src/modules/admin/mocks/role.handlers.ts'))).toBe(false);
  expect(existsSync(resolve(projectRoot, 'src/modules/admin/pages/roles'))).toBe(false);
});
