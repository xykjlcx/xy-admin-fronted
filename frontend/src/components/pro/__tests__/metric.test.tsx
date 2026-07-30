import { render, screen } from '@testing-library/react';
import { Activity } from 'lucide-react';
import { Metric } from '@/components/pro/Metric';

test('Metric owns compact KPI geometry and an unboxed 16px icon', () => {
  const { container } = render(
    <Metric
      label="活跃用户"
      value="12,840"
      icon={<Activity />}
      trend={{ label: '较上周', value: '12%', direction: 'positive' }}
    />,
  );

  const metric = container.querySelector('[data-slot="metric"]');
  const icon = container.querySelector('[data-slot="metric-icon"]');
  const trend = screen.getByText(/12%/);

  expect(metric).toHaveClass('min-h-(--metric-min-h)', 'p-(--metric-spacing)');
  expect(icon).toHaveClass('[&>svg]:size-[calc(16px*var(--app-scale))]');
  expect(icon).not.toHaveClass('bg-(--accent-emphasis-soft)');
  expect(trend).toHaveAttribute('data-direction', 'positive');
  expect(trend).toHaveTextContent('▲');
});

test('Metric handles long labels, large negative values and missing trends without overflow contracts', () => {
  const { rerender } = render(
    <Metric
      label="Very long cross-border fulfillment metric"
      value="-¥12,840,000.58"
      trend={{ label: '较上周', value: '8%', direction: 'negative' }}
    />,
  );

  expect(screen.getByText('Very long cross-border fulfillment metric')).toHaveClass('break-words');
  expect(screen.getByText('-¥12,840,000.58')).toHaveClass('break-all');
  expect(screen.getByText(/8%/)).toHaveTextContent('▼');

  rerender(<Metric label="新增角色" value="3" />);
  expect(screen.queryByText('较上周')).not.toBeInTheDocument();
});
