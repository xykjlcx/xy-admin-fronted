import { http, bindTokenGetter } from '@/lib/http/client';
import { queryOptions } from '@tanstack/react-query';
import { useAuth } from '@/stores/auth';

// token 取值绑定到 auth store（模块副作用，import 即生效）
bindTokenGetter(() => useAuth.getState().token);

export interface MeDto {
  user: { id: string; name: string; username: string };
  roles: string[];
  permissions: string[];
}

export const authApi = {
  login: (dto: { username: string; password: string }) =>
    http.post<{ token: string }>('/api/auth/login', dto),
  me: () => http.get<MeDto>('/api/auth/me'),
  logout: () => http.post<null>('/api/auth/logout'),
};

export const meQuery = queryOptions({
  queryKey: ['auth', 'me'],
  queryFn: authApi.me,
  staleTime: 5 * 60_000,
});
