import { renderHook, act } from '@testing-library/react';
import { useShellBreadcrumbs } from '@/app/shell/layouts/use-shell-breadcrumbs';

test('相同 label 的新数组不触发状态更新（内容级去重）', () => {
  const { result } = renderHook(() => useShellBreadcrumbs());

  act(() => result.current.onHeaderBreadcrumbsChange([{ label: '组织与权限' }]));
  const first = result.current.breadcrumbs;

  // 页面每次渲染传新数组字面量——内容相同必须保持同一 state 引用，Shell header 才不空转
  act(() => result.current.onHeaderBreadcrumbsChange([{ label: '组织与权限' }]));
  expect(result.current.breadcrumbs).toBe(first);

  act(() => result.current.onHeaderBreadcrumbsChange([{ label: '成员与部门' }]));
  expect(result.current.breadcrumbs).toEqual([{ label: '成员与部门' }]);
});

test('chrome（PageFrameChromeProvider value）引用跨渲染稳定', () => {
  const { result, rerender } = renderHook(() => useShellBreadcrumbs());
  const first = result.current.chrome;

  rerender();

  expect(result.current.chrome).toBe(first);
  expect(first.breadcrumbPlacement).toBe('header');
});
