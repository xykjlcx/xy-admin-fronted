import { queryClient } from '@/app/query';
import { useAuth } from '@/stores/auth';

// 会话切换的缓存清理单点：清 auth 域缓存（me 等）+ 设置下一个 token。
// 登录成功传新 token（防上个账号的 me 被 beforeLoad 复用导致权限串号）；401/登出传 null。
// logout 接线在 Task 11 UserMenu，届时同用 resetAuth。
export function resetAuth(nextToken: string | null) {
  queryClient.removeQueries({ queryKey: ['auth'] });
  useAuth.getState().setToken(nextToken);
}
