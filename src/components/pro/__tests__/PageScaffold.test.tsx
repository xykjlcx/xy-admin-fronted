import { render, screen } from '@testing-library/react';
import { PageFrame, PageSurface } from '@/components/pro/PageScaffold';

test('PageFrame 和 PageSurface 暴露稳定 class 供 shell 布局降噪', () => {
  const { container } = render(
    <PageFrame breadcrumbs={[{ label: '组织与权限' }, { label: '成员与部门' }]}>
      <PageSurface>成员列表</PageSurface>
    </PageFrame>,
  );

  const frame = container.querySelector('section');
  const surface = screen.getByText('成员列表');

  expect(frame).toHaveClass('ui-page-frame');
  expect(frame).toHaveClass('bg-(--page-frame-bg)');
  expect(frame).toHaveClass('px-(--page-frame-px)');
  expect(frame).toHaveClass('py-(--page-frame-py)');
  expect(surface).toHaveClass('ui-page-surface');
  expect(surface).toHaveClass('border-(--page-surface-border)');
  expect(surface).toHaveClass('bg-(--page-surface-bg)');
  expect(surface).toHaveClass('shadow-(--page-surface-shadow)');
});
