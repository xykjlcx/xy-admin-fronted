import { subsystemKeyFromPath } from '@/app/shell/subsystem-key';

test('应用级路由在Shell卸载过渡期复用admin缓存key', () => {
  expect(subsystemKeyFromPath('/login')).toBe('admin');
  expect(subsystemKeyFromPath('/403')).toBe('admin');
  expect(subsystemKeyFromPath('/lastmile/overview')).toBe('lastmile');
});
