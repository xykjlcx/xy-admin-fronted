import { render, screen } from '@testing-library/react';
import { PageFrame, PageFrameChromeProvider, PageSurface } from '@/components/pro/PageScaffold';

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
  expect(frame).toHaveClass('flex-(--page-frame-flex)');
  expect(frame).toHaveClass('min-h-(--page-frame-min-h)');
  expect(surface).toHaveClass('ui-page-surface');
  expect(surface).toHaveClass('flex-(--page-surface-flex)');
  expect(surface).toHaveClass('min-h-(--page-surface-min-h)');
  expect(surface).toHaveClass('border-(--page-surface-border)');
  expect(surface).toHaveClass('bg-(--page-surface-bg)');
  expect(surface).toHaveClass('shadow-(--page-surface-shadow)');
});

test('PageFrame 支持 shell 注入面包屑前置操作和分割线', () => {
  const { container } = render(
    <PageFrameChromeProvider value={{ breadcrumbPrefix: <button type="button">收起导航</button> }}>
      <PageFrame breadcrumbs={[{ label: '组织与权限' }, { label: '菜单管理' }]}>
        <PageSurface>菜单树</PageSurface>
      </PageFrame>
    </PageFrameChromeProvider>,
  );

  const breadcrumb = container.querySelector('[data-slot="page-breadcrumb"]');
  const divider = container.querySelector('[data-slot="page-breadcrumb-divider"]');

  expect(breadcrumb).toContainElement(screen.getByRole('button', { name: '收起导航' }));
  expect(divider).toHaveClass('bg-(--page-breadcrumb-divider)');
  expect(screen.getByText('菜单管理')).toBeInTheDocument();
});

test('PageFrame 支持把面包屑交给 shell header 承载', () => {
  const onHeaderBreadcrumbsChange = vi.fn();
  const { container, unmount } = render(
    <PageFrameChromeProvider
      value={{
        breadcrumbPlacement: 'header',
        onHeaderBreadcrumbsChange,
      }}
    >
      <PageFrame breadcrumbs={[{ label: '组织与权限' }, { label: '成员与部门' }]}>
        <PageSurface>成员列表</PageSurface>
      </PageFrame>
    </PageFrameChromeProvider>,
  );

  expect(container.querySelector('[data-slot="page-breadcrumb"]')).not.toBeInTheDocument();
  expect(onHeaderBreadcrumbsChange).toHaveBeenCalledWith([{ label: '组织与权限' }, { label: '成员与部门' }]);

  unmount();

  expect(onHeaderBreadcrumbsChange).toHaveBeenLastCalledWith([]);
});

test('header 模式重渲染只发布新值，不先清空再发布（防 Shell header 空转）', () => {
  const onHeaderBreadcrumbsChange = vi.fn();
  const chrome = { breadcrumbPlacement: 'header' as const, onHeaderBreadcrumbsChange };
  const view = (label: string) => (
    <PageFrameChromeProvider value={chrome}>
      {/* 模拟页面写法：breadcrumbs 每次渲染都是新数组字面量 */}
      <PageFrame breadcrumbs={[{ label }]}>
        <PageSurface>内容</PageSurface>
      </PageFrame>
    </PageFrameChromeProvider>
  );
  const { rerender } = render(view('组织与权限'));

  expect(onHeaderBreadcrumbsChange).toHaveBeenCalledTimes(1);

  // 同内容重渲染：会再次发布（引用变化），但绝不发 []——由接收端做内容级去重
  rerender(view('组织与权限'));
  expect(onHeaderBreadcrumbsChange).not.toHaveBeenCalledWith([]);

  // 内容变化：发布新值，依然没有中间的 [] 清空
  rerender(view('成员与部门'));
  expect(onHeaderBreadcrumbsChange).toHaveBeenLastCalledWith([{ label: '成员与部门' }]);
  expect(onHeaderBreadcrumbsChange).not.toHaveBeenCalledWith([]);
});
