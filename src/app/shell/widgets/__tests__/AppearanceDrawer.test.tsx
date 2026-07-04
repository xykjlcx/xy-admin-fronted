import i18n from 'i18next';
import { render, screen } from '@testing-library/react';
import userEvent, { PointerEventsCheckLevel } from '@testing-library/user-event';
import { beforeAll, beforeEach } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AppearanceDrawer } from '@/app/shell/widgets/AppearanceDrawer';
import { i18nInit } from '@/lib/i18n';
import { useAppearance } from '@/stores/appearance';

const DEFAULTS = {
  flavor: 'feishu',
  mode: 'light',
  accent: 'blue',
  customAccent: '#c96442',
  zoom: 'md',
  radius: 'default',
  layout: 'sidebar',
  pageAnim: 'fade',
  collapsed: {},
  _priResolved: '#3370ff',
  _priSoftResolved: '#eef3ff',
} as const;

beforeAll(async () => {
  await i18nInit;
});

beforeEach(async () => {
  await i18n.changeLanguage('zh-CN');
  useAppearance.setState(DEFAULTS);
});

test('外观设置可以切换到 shadcn 风格并使用其中性默认主题色', async () => {
  const user = userEvent.setup({ pointerEventsCheck: PointerEventsCheckLevel.Never });
  render(
    <TooltipProvider>
      <AppearanceDrawer />
    </TooltipProvider>,
  );

  await user.click(screen.getByRole('button', { name: '外观设置' }));
  await user.click(await screen.findByRole('button', { name: /shadcn 风格/ }));

  expect(useAppearance.getState().flavor).toBe('shadcn');
  expect(useAppearance.getState().accent).toBe('shadcn');
});
