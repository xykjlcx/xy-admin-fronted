import { render, screen } from '@testing-library/react';
import { DescriptionList } from '@/components/pro/DescriptionList';

test('DescriptionList owns compact multi-column and empty presentation', () => {
  const { rerender } = render(
    <DescriptionList columns={2} density="compact" items={[{ label: '路由', value: '/admin/menus' }]} />,
  );

  expect(screen.getByText('/admin/menus').closest('dl')).toHaveAttribute('data-density', 'compact');
  expect(screen.getByText('/admin/menus').closest('dl')).toHaveClass('sm:grid-cols-2');

  rerender(<DescriptionList columns={2} density="compact" items={[]} empty="暂无配置" />);
  expect(screen.getByText('暂无配置')).toHaveAttribute('data-slot', 'description-list-empty');
});

test('DescriptionList supports card records with a dedicated trailing action slot', () => {
  const { container } = render(
    <DescriptionList
      presentation="cards"
      density="compact"
      items={[
        {
          label: '上传文件',
          value: 'file:doc:upload',
          actions: <button type="button">编辑上传文件</button>,
        },
      ]}
    />,
  );

  const list = container.querySelector('[data-slot="description-list"]');
  const item = screen.getByText('上传文件').closest('[data-slot="description-list-item"]');

  expect(list).toHaveAttribute('data-presentation', 'cards');
  expect(item).toHaveClass('bg-(--pro-panel-bg)', 'border-(--page-section-divider)');
  expect(screen.getByText('上传文件')).toHaveClass('font-medium', 'text-text');
  expect(screen.getByText('file:doc:upload')).toHaveClass('text-xs', 'text-text-3');
  expect(
    screen.getByRole('button', { name: '编辑上传文件' }).closest('[data-slot="description-list-actions"]'),
  ).toBeInTheDocument();
});
