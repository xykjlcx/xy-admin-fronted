import { env } from './env';

// appConfig 放“工程级默认值”：路由常量、存储 key、版本和语言。
// 它不是运行时状态，用户可变的外观/登录态分别交给对应 store。
export const appConfig = {
  id: 'admin-scaffold-frontend',
  version: env.appVersion,
  defaultLocale: env.defaultLocale,
  supportedLocales: ['zh-CN', 'en-US'],
  routes: {
    home: '/admin/dashboard',
    login: '/login',
    forbidden: '/403',
    notFound: '/404',
  },
  storageKeys: {
    auth: 'auth',
    appearance: 'appearance',
    mockSessions: 'mock-sessions',
  },
} as const;
