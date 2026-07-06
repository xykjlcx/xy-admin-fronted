import {
  appConfig,
  appearanceConfig,
  createFeatureConfig,
  createRequestConfig,
  parseEnv,
} from '@/config';

test('parseEnv supplies stable defaults for local development', () => {
  const parsed = parseEnv({ MODE: 'development', DEV: true, PROD: false });

  expect(parsed).toMatchObject({
    mode: 'development',
    appEnv: 'development',
    appVersion: '0.1.0',
    apiBaseUrl: '',
    defaultLocale: 'zh-CN',
    requestTimeoutMs: 15000,
    enableMockOverride: undefined,
    enableDevtoolsOverride: undefined,
    enableVisualDebugOverride: undefined,
  });
});

test('feature config preserves mock gating rules', () => {
  expect(createFeatureConfig(parseEnv({ MODE: 'development', DEV: true, PROD: false })).enableMock).toBe(true);
  expect(
    createFeatureConfig(
      parseEnv({ MODE: 'development', DEV: true, PROD: false, VITE_ENABLE_MOCK: 'false' }),
    ).enableMock,
  ).toBe(false);
  expect(createFeatureConfig(parseEnv({ MODE: 'production', DEV: false, PROD: true })).enableMock).toBe(false);
  expect(
    createFeatureConfig(
      parseEnv({ MODE: 'production', DEV: false, PROD: true, VITE_ENABLE_MOCK: 'true' }),
    ).enableMock,
  ).toBe(true);
  expect(createFeatureConfig(parseEnv({ MODE: 'demo', DEV: false, PROD: true })).enableMock).toBe(true);
});

test('feature config gates dev-only surfaces by environment', () => {
  // /dev/theme-states 的环境门前提：dev 放行、生产拦截、生产可用 VITE_ENABLE_VISUAL_DEBUG 逃生阀
  const dev = createFeatureConfig(parseEnv({ MODE: 'development', DEV: true, PROD: false }));
  expect(dev.isDev).toBe(true);

  const prod = createFeatureConfig(parseEnv({ MODE: 'production', DEV: false, PROD: true }));
  expect(prod.isDev).toBe(false);
  expect(prod.enableVisualDebug).toBe(false);

  const prodDebug = createFeatureConfig(
    parseEnv({ MODE: 'production', DEV: false, PROD: true, VITE_ENABLE_VISUAL_DEBUG: 'true' }),
  );
  expect(prodDebug.enableVisualDebug).toBe(true);
});

test('request config is derived from validated env and keeps backend contract knobs together', () => {
  const request = createRequestConfig(
    parseEnv({
      MODE: 'production',
      DEV: false,
      PROD: true,
      VITE_API_BASE_URL: 'https://api.example.com',
      VITE_REQUEST_TIMEOUT_MS: '8000',
    }),
  );

  expect(request).toEqual({
    baseUrl: 'https://api.example.com',
    timeoutMs: 8000,
    authHeaderName: 'Authorization',
    authTokenPrefix: 'Bearer',
    authExpiredStatus: 401,
    successCodes: [0],
    envelope: { code: 'code', data: 'data', message: 'message' },
  });
});

test('invalid request timeout is rejected at config boundary', () => {
  expect(() =>
    parseEnv({
      MODE: 'production',
      DEV: false,
      PROD: true,
      VITE_REQUEST_TIMEOUT_MS: '0',
    }),
  ).toThrow(/VITE_REQUEST_TIMEOUT_MS/);
});

test('app and appearance defaults are centralised without replacing runtime store state', () => {
  expect(appConfig.routes).toEqual({
    home: '/admin/dashboard',
    login: '/login',
    forbidden: '/403',
    notFound: '/404',
  });
  expect(appConfig.storageKeys).toEqual({
    auth: 'auth',
    appearance: 'appearance',
    mockSessions: 'mock-sessions',
  });
  expect(appearanceConfig.defaults).toEqual({
    flavor: 'feishu',
    mode: 'light',
    accent: 'blue',
    customAccent: '#d97757',
    zoom: 'md',
    radius: 'default',
    layout: 'sidebar',
    pageAnim: 'fade',
  });
});
