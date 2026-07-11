import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

test('all Shell layouts expose updater state only through the user menu', () => {
  const headerActions = readFileSync('src/app/shell/widgets/HeaderActions.tsx', 'utf8');
  const insetLayout = readFileSync('src/app/shell/layouts/InsetLayout.tsx', 'utf8');
  const userMenu = readFileSync('src/app/shell/widgets/UserMenu.tsx', 'utf8');
  const updateStatus = readFileSync('src/app/shell/widgets/UpdateStatus.tsx', 'utf8');

  expect(headerActions).not.toContain('UpdateStatus');
  expect(insetLayout).not.toContain('UpdateStatus');
  expect(userMenu).toContain('<UpdateStatus>');
  expect(userMenu).toContain('entry.supported');
  expect(updateStatus).toContain('updater.supported');
  expect(userMenu).not.toContain("platform.runtime === 'desktop'");
  expect(userMenu).toContain('entry.activate()');
});
