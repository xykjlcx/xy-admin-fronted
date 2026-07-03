// 全部 mock handlers 的聚合点；browser.ts 只依赖本文件，不直接罗列各域 handlers
import { authHandlers } from '@/modules/admin/mocks/auth.handlers';
import { menuHandlers } from '@/modules/admin/mocks/menu.handlers';
import { userHandlers } from '@/modules/admin/mocks/user.handlers';

export const allHandlers = [...authHandlers, ...menuHandlers, ...userHandlers];
