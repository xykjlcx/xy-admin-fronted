// http ↔ router 解耦（spec §9）：http 层不感知路由，只广播事件，由上层（router 装配处）订阅并跳转登录页
type Handler = () => void;
const handlers = new Set<Handler>();
export const authEvents = {
  // 返回退订函数，防 HMR / 组件重复挂载导致的重复订阅泄漏
  on: (_: 'expired', h: Handler) => {
    handlers.add(h);
    return () => handlers.delete(h);
  },
  emit: (_: 'expired') => handlers.forEach((h) => h()),
};
