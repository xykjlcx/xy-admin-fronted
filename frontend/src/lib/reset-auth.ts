import { queryClient } from '@/app/query';
import { useAuth } from '@/stores/auth';
import { bumpAuthSessionEpoch } from '@/lib/http/client';

// 会话切换的唯一入口：换 token + 清空全部 Query/Mutation 缓存。
// 只清 ['auth'] 不够——导航（['nav',*] staleTime Infinity）、users/roles/depts 等缓存也会串号，
// 所以这里整体 clear()，保证换账号后任何业务缓存都不会复用上个账号的数据。
//
// 时序纪律（调用方负责）：
// - 登录成功：在 /login 调用（受保护树未挂载，clear 安全），随后 router.invalidate 重新拉新账号数据。
// - 登出 / 401 过期：调用方必须先导航离开 _auth 受保护树、再 await resetSession(null)；
//   否则 Shell 里挂载中的 useSuspenseQuery 会立刻用空 token 重新发请求（多余 401 + 错误闪烁）。
export async function resetSession(nextToken: string | null) {
  useAuth.getState().setToken(nextToken);
  // token 值可能被复用，所以会话代际必须由唯一切换入口显式推进，不从字符串变化猜测。
  bumpAuthSessionEpoch();
  // 先 cancel 再 clear：中断在途请求，避免它们 resolve 后把旧账号数据回填进刚清空的缓存。
  await queryClient.cancelQueries();
  queryClient.clear();
}
