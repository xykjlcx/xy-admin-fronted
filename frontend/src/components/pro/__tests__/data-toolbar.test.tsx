import { render, screen } from '@testing-library/react';
import {
  DataToolbar,
  DataToolbarGroup,
  SummaryStrip,
} from '@/components/pro/DataToolbar';

test('DataToolbar owns compact grouped list controls', () => {
  render(
    <DataToolbar aria-label="运单筛选">
      <DataToolbarGroup>
        <button type="button">搜索</button>
        <button type="button">状态</button>
      </DataToolbarGroup>
      <DataToolbarGroup align="end" aria-label="运单筛选尾部操作">
        <button type="button">导出</button>
      </DataToolbarGroup>
    </DataToolbar>,
  );

  const toolbar = screen.getByRole('toolbar', { name: '运单筛选' });
  const endGroup = screen.getByRole('group', { name: '运单筛选尾部操作' });

  expect(toolbar).toHaveAttribute('data-slot', 'data-toolbar');
  expect(toolbar).toHaveClass('gap-[calc(8px*var(--app-scale))]');
  expect(endGroup).toHaveAttribute('data-align', 'end');
  expect(endGroup).toHaveClass('ml-auto');
});

test('SummaryStrip renders compact semantic metrics without card chrome', () => {
  const { container } = render(
    <SummaryStrip
      aria-label="运单摘要"
      items={[
        { label: '待打单', value: 2 },
        { label: '运输中', value: 3 },
      ]}
    />,
  );

  const strip = screen.getByLabelText('运单摘要');
  const items = container.querySelectorAll('[data-slot="summary-strip-item"]');

  expect(strip).toHaveAttribute('data-slot', 'summary-strip');
  expect(strip).toHaveClass('bg-(--pro-toolbar-bg)');
  expect(items).toHaveLength(2);
  expect(screen.getByText('待打单')).toHaveClass('text-xs', 'text-text-3');
  expect(screen.getByText('2')).toHaveClass('text-sm', 'font-semibold', 'text-text');
});
