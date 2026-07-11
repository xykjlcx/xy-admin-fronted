import { render, screen } from '@testing-library/react';
import {
  PageFrame,
  PageFrameChromeProvider,
  PagePane,
  PagePaneBody,
  PagePaneFooter,
  PagePaneHeader,
  PagePaneToolbar,
  PageSection,
  PageSplit,
  PageSurface,
  PageThreePane,
} from '@/components/pro/PageScaffold';

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

test('PageScaffold owns master-detail pane and section presentation', () => {
  render(
    <PageSurface>
      <PageSplit>
        <PagePane variant="master">
          <PagePaneHeader title="菜单管理" meta="5 个节点" actions={<button type="button">新增</button>} />
          <PagePaneToolbar>搜索</PagePaneToolbar>
          <PagePaneBody>菜单树</PagePaneBody>
        </PagePane>
        <PagePane variant="detail">
          <PageSection title="基本信息">详情</PageSection>
        </PagePane>
      </PageSplit>
    </PageSurface>,
  );

  expect(screen.getByTestId('page-split')).toHaveClass('xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]');
  expect(screen.getByText('菜单管理').closest('[data-slot="page-pane-header"]')).toBeInTheDocument();
  expect(screen.getByText('搜索').closest('[data-slot="page-pane-toolbar"]')).toBeInTheDocument();
  expect(screen.getByText('菜单树').closest('[data-slot="page-pane-body"]')).toBeInTheDocument();
  expect(screen.getByText('详情').closest('[data-slot="page-section"]')).toBeInTheDocument();
});

test('PagePaneHeader stacks metadata below its title so pane actions cannot squeeze the heading', () => {
  const { container } = render(
    <PagePaneHeader title="菜单管理" meta="5 个节点" actions={<button type="button">新增菜单</button>} />,
  );

  expect(container.querySelector('[data-slot="page-pane-heading"]')).toHaveClass('flex-col');
  expect(screen.getByText('5 个节点')).toHaveAttribute('data-slot', 'page-pane-meta');
});

test('PageScaffold exposes canvas pane bodies and card or plain section surfaces', () => {
  const { container } = render(
    <PagePaneBody tone="canvas">
      <PageSection variant="card" leading={<span>图标</span>} title="对象摘要">
        摘要内容
      </PageSection>
      <PageSection variant="plain" title="操作列表">
        操作内容
      </PageSection>
    </PagePaneBody>,
  );

  expect(container.querySelector('[data-slot="page-pane-body"]')).toHaveAttribute('data-tone', 'canvas');
  expect(screen.getByText('对象摘要').closest('[data-slot="page-section"]')).toHaveAttribute(
    'data-variant',
    'card',
  );
  expect(screen.getByText('图标').closest('[data-slot="page-section-leading"]')).toBeInTheDocument();
  expect(screen.getByText('操作列表').closest('[data-slot="page-section"]')).toHaveAttribute(
    'data-variant',
    'plain',
  );
});

test('PageScaffold owns responsive 2:3:5 three-pane workspace presentation', () => {
  render(
    <PageThreePane>
      <PagePane variant="navigation">
        <PagePaneHeader title="子系统管理" />
        <PagePaneBody>子系统卡片</PagePaneBody>
        <PagePaneFooter>新增子系统</PagePaneFooter>
      </PagePane>
      <PagePane variant="master">
        <PagePaneHeader title="菜单管理" />
      </PagePane>
      <PagePane variant="detail">
        <PagePaneHeader title="菜单详情" />
      </PagePane>
    </PageThreePane>,
  );

  expect(screen.getByTestId('page-three-pane')).toHaveClass(
    'lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]',
    'xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_minmax(0,5fr)]',
  );
  expect(screen.getByText('子系统卡片').closest('[data-variant="navigation"]')).toBeInTheDocument();
  expect(screen.getByText('新增子系统').closest('[data-slot="page-pane-footer"]')).toBeInTheDocument();
});
