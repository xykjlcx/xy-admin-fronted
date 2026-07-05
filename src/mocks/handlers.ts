// 全部 mock handlers 的聚合点；browser.ts 只依赖本文件，不直接罗列各域 handlers
import { authHandlers } from '@/modules/admin/mocks/auth.handlers';
import { dashboardHandlers } from '@/modules/admin/mocks/dashboard.handlers';
import { menuHandlers } from '@/modules/admin/mocks/menu.handlers';
import { roleHandlers } from '@/modules/admin/mocks/role.handlers';
import { usersModuleHandlers } from '@/modules/admin/users/mocks';

export const allHandlers = [
  ...authHandlers,
  ...dashboardHandlers,
  ...menuHandlers,
  ...usersModuleHandlers,
  ...roleHandlers,
];
