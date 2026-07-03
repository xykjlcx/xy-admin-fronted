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

// ── 通用集合工厂（CRUD + reset；id 生成用独立的 genId，工厂本身不自动生成）──────────
// 每个域一行 createCollection(seed, key) 即得完整 CRUD，免手写 find/set 样板。
// 注意：all()/find() 返回内存活引用（可被直接 mutate），仅限 mock 内部使用。
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

// mock 会话（token -> userId）借 localStorage 跨刷新保活：db 是随模块重新求值而清零的内存对象，
// 若会话只存在内存里，浏览器刷新会让所有已登录 token 瞬间失效（表现为"刷新即被踢回登录页"），
// 而真实后端的会话不会因客户端刷新而失效——这里让 mock 行为向真实后端对齐。
// 用 localStorage 而非 sessionStorage：与 zustand persist 存 token 的存储域保持一致（多 tab 共享、
// 重启浏览器后仍保活），否则会出现"token 跨 tab 有效但 session 只在开 tab 里查得到"的域错配。
const SESSION_STORAGE_KEY = 'mock-sessions';

function loadSessions(): Map<string, string> {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? new Map(JSON.parse(raw) as [string, string][]) : new Map();
  } catch {
    return new Map();
  }
}

function createSessionStore() {
  const map = loadSessions();
  const persist = () => {
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify([...map]));
    } catch {
      // 写失败（隐私模式/配额满）静默降级为纯内存，与读侧 loadSessions 的守护对称
    }
  };
  return {
    get: (token: string) => map.get(token),
    set: (token: string, userId: string) => {
      map.set(token, userId);
      persist();
    },
    remove: (token: string) => {
      map.delete(token);
      persist();
    },
    clear: () => {
      map.clear();
      persist();
    },
  };
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
  sessions: createSessionStore(), // token -> userId
};
