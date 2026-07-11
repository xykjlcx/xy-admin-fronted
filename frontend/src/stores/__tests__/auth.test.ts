import { useAuth } from '@/stores/auth';

beforeEach(() => {
  localStorage.clear();
  useAuth.setState({ token: null }); // 合并而非 replace，避免连 setToken 一起冲掉
});

test('setToken 往返：写入后可读，写 null 清除', () => {
  useAuth.getState().setToken('tok-123');
  expect(useAuth.getState().token).toBe('tok-123');

  useAuth.getState().setToken(null);
  expect(useAuth.getState().token).toBeNull();
});
