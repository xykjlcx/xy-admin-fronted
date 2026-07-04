import { env, type ParsedEnv } from './env';

// Feature config 给业务层做语义判断，隐藏 Vite 环境变量的读取细节。
// 注意：mock worker 是否动态加载仍由 env.ts 的编译期条件负责，那里承担生产包剥离。
export function createFeatureConfig(source: ParsedEnv) {
  const isDemo = source.mode === 'demo' || source.appEnv === 'demo';

  return {
    isDev: source.dev,
    isProd: source.prod,
    isDemo,
    enableMock:
      source.enableMockOverride === true ||
      isDemo ||
      (source.dev && source.enableMockOverride !== false),
    enableDevtools: source.enableDevtoolsOverride ?? source.dev,
    enableVisualDebug: source.enableVisualDebugOverride ?? false,
  };
}

export const featuresConfig = createFeatureConfig(env);
