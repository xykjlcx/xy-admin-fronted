import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

test('all Shell layouts expose one host updater status and the user menu keeps manual check', () => {
  const headerActions = readFileSync('src/app/shell/widgets/HeaderActions.tsx', 'utf8');
  const insetLayout = readFileSync('src/app/shell/layouts/InsetLayout.tsx', 'utf8');
  const userMenu = readFileSync('src/app/shell/widgets/UserMenu.tsx', 'utf8');

  expect(headerActions).toContain('<UpdateStatus />');
  expect(insetLayout).toContain('<UpdateStatus />');
  expect(userMenu).toContain('platform.updater.supported');
  expect(userMenu).not.toContain("platform.runtime === 'desktop'");
  expect(userMenu).toContain("t('update.actions.check')");
  expect(userMenu).toContain('platform.updater.check()');
});
