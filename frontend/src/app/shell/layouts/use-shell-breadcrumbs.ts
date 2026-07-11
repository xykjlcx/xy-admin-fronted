import { useCallback, useMemo, useState } from 'react';
import type { PageBreadcrumbItem } from '@/components/pro/PageScaffold';

function areBreadcrumbsEqual(left: PageBreadcrumbItem[], right: PageBreadcrumbItem[]) {
  if (left.length !== right.length) return false;
  return left.every((item, index) => item.label === right[index]?.label);
}

// Shell 三布局共用的面包屑接收端：页面经 PageFrame 上报，header 渲染。
// chrome 是喂给 PageFrameChromeProvider 的稳定值——内联对象会让所有 PageFrame 消费者
// 随布局每次渲染重渲染，必须 memo。
export function useShellBreadcrumbs() {
  const [breadcrumbs, setBreadcrumbs] = useState<PageBreadcrumbItem[]>([]);
  const onHeaderBreadcrumbsChange = useCallback((next: PageBreadcrumbItem[]) => {
    setBreadcrumbs((prev) => (areBreadcrumbsEqual(prev, next) ? prev : next));
  }, []);
  const chrome = useMemo(
    () => ({ breadcrumbPlacement: 'header' as const, onHeaderBreadcrumbsChange }),
    [onHeaderBreadcrumbsChange],
  );

  return { breadcrumbs, onHeaderBreadcrumbsChange, chrome };
}
