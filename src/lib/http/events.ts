// http ↔ router 解耦（spec §9）：http 层不感知路由，只广播事件，由上层（router 装配处）订阅并跳转登录页
type Handler = () => void;
const handlers = new Set<Handler>();
/* eslint-disable @typescript-eslint/no-unused-vars -- 事件名参数当前只有一种取值，仅用于类型约束，未来多事件时会用到 */
export const authEvents = {
  on: (_: 'expired', h: Handler) => handlers.add(h),
  emit: (_: 'expired') => handlers.forEach((h) => h()),
};
/* eslint-enable @typescript-eslint/no-unused-vars */
