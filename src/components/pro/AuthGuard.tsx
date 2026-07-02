import type { ReactNode } from 'react';
import { usePermission } from '@/lib/use-permission';

// 区块级权限门：无权限渲染 fallback（默认 null）
export function AuthGuard({
  permission,
  children,
  fallback = null,
}: {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const can = usePermission();
  return can(permission) ? children : fallback;
}
