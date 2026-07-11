import { deptHandlers } from './dept.handlers';
import { userHandlers } from './user.handlers';

export const usersModuleHandlers = [...deptHandlers, ...userHandlers];

export { deptHandlers, userHandlers };
