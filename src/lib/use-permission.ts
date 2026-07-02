import { useSuspenseQuery } from '@tanstack/react-query';
import { meQuery } from '@/modules/admin/api/auth.api';
import { matchPermission } from '@/lib/permission';

// me 已由 _auth beforeLoad 预取，此处 Suspense 直取缓存；返回权限判定闭包供组件做按钮级/区块级校验
export function usePermission() {
  const { data } = useSuspenseQuery(meQuery);
  return (need: string) => matchPermission(data.permissions, need);
}
