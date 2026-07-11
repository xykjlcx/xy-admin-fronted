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
  _priActiveResolved: null,
  _priSoftResolved: '#eef3ff',
  _onPriResolved: '#ffffff',
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

test('点风格卡套用完整视觉预设：切 claude 后 radius/zoom 被重置为预设值', async () => {
  const user = userEvent.setup({ pointerEventsCheck: PointerEventsCheckLevel.Never });
  // 先把用户细调轴改成非预设值
  useAppearance.setState({ ...DEFAULTS, radius: 'round', zoom: 'lg' });
  render(
    <TooltipProvider>
      <AppearanceDrawer />
    </TooltipProvider>,
  );

  await user.click(screen.getByRole('button', { name: '外观设置' }));
  await user.click(await screen.findByRole('button', { name: /Claude 风格/ }));

  const s = useAppearance.getState();
  expect(s.flavor).toBe('claude');
  expect(s.accent).toBe('claude');
  expect(s.radius).toBe('default'); // 被完整预设覆盖
  expect(s.zoom).toBe('md');        // 被完整预设覆盖
});

test('外观设置展示六个配置步骤', async () => {
  const user = userEvent.setup({ pointerEventsCheck: PointerEventsCheckLevel.Never });
  render(
    <TooltipProvider>
      <AppearanceDrawer />
    </TooltipProvider>,
  );
  await user.click(screen.getByRole('button', { name: '外观设置' }));
  expect(await screen.findByText(i18n.t('shell.appearanceDrawer.layout'))).toBeInTheDocument();
  expect(await screen.findByText(i18n.t('shell.appearanceDrawer.groupPreset'))).toBeInTheDocument();
  expect(screen.getByText(i18n.t('shell.appearanceDrawer.accent'))).toBeInTheDocument();
  expect(screen.getByText(i18n.t('shell.appearanceDrawer.zoom'))).toBeInTheDocument();
  expect(screen.getByText(i18n.t('shell.appearanceDrawer.pageAnim'))).toBeInTheDocument();
  expect(screen.getByText(i18n.t('shell.appearanceDrawer.radius'))).toBeInTheDocument();
});

test('外观设置按导航布局优先的六步顺序渲染，导航布局使用两列容器', async () => {
  const user = userEvent.setup({ pointerEventsCheck: PointerEventsCheckLevel.Never });
  render(
    <TooltipProvider>
      <AppearanceDrawer />
    </TooltipProvider>,
  );

  await user.click(screen.getByRole('button', { name: '外观设置' }));

  const orderedSteps = [
    i18n.t('shell.appearanceDrawer.layout'),
    i18n.t('shell.appearanceDrawer.groupPreset'),
    i18n.t('shell.appearanceDrawer.accent'),
    i18n.t('shell.appearanceDrawer.zoom'),
    i18n.t('shell.appearanceDrawer.pageAnim'),
    i18n.t('shell.appearanceDrawer.radius'),
  ].map((label) => screen.getByText(label));

  for (let i = 0; i < orderedSteps.length - 1; i += 1) {
    expect(orderedSteps[i]!.compareDocumentPosition(orderedSteps[i + 1]!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  }

  expect(screen.getByRole('button', { name: /侧栏树/ }).parentElement).toHaveClass('grid-cols-2');
});
