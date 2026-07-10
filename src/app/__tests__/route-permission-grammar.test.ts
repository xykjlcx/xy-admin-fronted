import { readFileSync, readdirSync } from 'node:fs';
import { extname, resolve } from 'node:path';

import { collectRoutePermissionViolations } from './route-permission-ast';

const projectRoot = resolve(__dirname, '../../..');
const routesRoot = resolve(projectRoot, 'src/routes');

function collectRouteFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return collectRouteFiles(path);
    return ['.ts', '.tsx'].includes(extname(entry.name)) ? [path] : [];
  });
}

test('route staticData permissions use the canonical three-segment grammar', () => {
  const violations = collectRouteFiles(routesRoot).flatMap((filePath) =>
    collectRoutePermissionViolations(filePath, readFileSync(filePath, 'utf8')),
  );

  expect(violations).toEqual([]);
});

test('AST guard rejects two-segment page and action permission literals without executing routes', () => {
  const source = `
    export const Route = createFileRoute('/fixture')({
      staticData: {
        permission: 'fixture:view',
        actions: [{ code: 'iam:create', labelKey: 'fixture.create' }],
      },
    });
  `;

  const violations = collectRoutePermissionViolations('fixture.tsx', source);

  expect(violations.map(({ kind, code }) => ({ kind, code }))).toEqual([
    { kind: 'page', code: 'fixture:view' },
    { kind: 'action', code: 'iam:create' },
  ]);
});
