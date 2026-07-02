// 关系型内存库；M0 建 auth/menu/subsystem 域，M1 扩其余域（见 spec §5.3）。
// auth(users/sessions) 是模式落地前的手写域；menu/subsystem 起用 createCollection 模式，M1 的 18 个域照此复制。
import { faker } from '@faker-js/faker/locale/zh_CN';

faker.seed(42); // 固定种子，防视觉回归截图因随机数据 flaky

export interface MockUser {
  id: string;
  username: string;
  password: string;
  name: string;
  roles: string[];
  permissions: string[]; // 通配符演示：admin 账号 ['*:*:*']
}

// ── 通用集合工厂（id 生成 + CRUD + reset）──────────────────────────────
// 每个域一行 createCollection(seed, key) 即得完整 CRUD，免手写 find/set 样板。
const collections: { reset: () => void }[] = [];
let idSeq = 0;

export const genId = (prefix = 'id') => `${prefix}-${++idSeq}`;

export function createCollection<T extends object, K extends keyof T>(seed: readonly T[], keyField: K) {
  const clone = (): T[] => seed.map((s) => ({ ...s }));
  let items: T[] = clone();
  const col = {
    all: () => items,
    find: (key: T[K]) => items.find((i) => i[keyField] === key),
    filter: (pred: (i: T) => boolean) => items.filter(pred),
    insert: (item: T) => {
      items.push(item);
      return item;
    },
    update: (key: T[K], patch: Partial<T>) => {
      const i = items.find((x) => x[keyField] === key);
      if (i) Object.assign(i, patch);
      return i;
    },
    remove: (key: T[K]) => {
      const before = items.length;
      items = items.filter((x) => x[keyField] !== key);
      return items.length < before;
    },
    reset: () => {
      items = clone();
    },
  };
  collections.push(col);
  return col;
}

// 测试隔离用：重置所有集合 + 清会话 + 归零 id 序列
export function resetDb() {
  for (const c of collections) c.reset();
  db.sessions.clear();
  idSeq = 0;
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
