import { render, screen } from '@testing-library/react';
import { DescriptionList } from '@/components/pro/DescriptionList';

test('DescriptionList owns compact multi-column and empty presentation', () => {
  const { rerender } = render(
    <DescriptionList
      columns={2}
      density="compact"
      items={[{ label: '路由', value: '/admin/menus' }]}
    />,
  );

  expect(screen.getByText('/admin/menus').closest('dl')).toHaveAttribute('data-density', 'compact');
  expect(screen.getByText('/admin/menus').closest('dl')).toHaveClass('sm:grid-cols-2');

  rerender(<DescriptionList columns={2} density="compact" items={[]} empty="暂无配置" />);
  expect(screen.getByText('暂无配置')).toHaveAttribute('data-slot', 'description-list-empty');
});
