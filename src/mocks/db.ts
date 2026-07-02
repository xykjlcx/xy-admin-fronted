// 关系型内存库；M0 只建 auth/menu/subsystem 域，M1 扩其余域（见 spec §5.3）
import { faker } from '@faker-js/faker/locale/zh_CN';

export interface MockUser {
  id: string;
  username: string;
  password: string;
  name: string;
  roles: string[];
  permissions: string[]; // 通配符演示：admin 账号 ['*:*:*']
}

export const db = {
  users: [
    {
      id: 'u1',
      username: 'admin',
      password: 'admin123',
      name: '超级管理员',
      roles: ['superadmin'],
      permissions: ['*:*:*'],
    },
    {
      id: 'u2',
      username: 'viewer',
      password: 'viewer123',
      name: faker.person.fullName(),
      roles: ['viewer'],
      permissions: ['dashboard:view', 'iam:user:view', 'iam:dept:view'],
    },
  ] as MockUser[],
  sessions: new Map<string, string>(), // token -> userId
};
