import { env, type ParsedEnv } from './env';

// Feature config 给业务层做语义判断，隐藏 Vite 环境变量的读取细节。
// 注意：mock worker 是否动态加载仍由 env.ts 的编译期条件负责，那里承担生产包剥离。
export function createFeatureConfig(source: ParsedEnv) {
  const isDemo = source.mode === 'demo' || source.appEnv === 'demo';

  return {
    isDev: source.dev,
    isProd: source.prod,
    isDemo,
    // 与 env.ts 的 shouldStartMockWorker 同语义：demo 恒开；dev 默认开、可显式关；生产恒关。
    // 运行时语义判断读这里；入口 worker 是否加载走 env.ts 的静态表达式（负责生产包剥离）。
    // 生产 + VITE_ENABLE_MOCK=true 必须是 false——worker 已被构建剥离，报 true 会误导消费方。
    enableMock: source.mode === 'demo' || (source.dev && source.enableMockOverride !== false),
    enableDevtools: source.enableDevtoolsOverride ?? source.dev,
    enableVisualDebug: source.enableVisualDebugOverride ?? false,
    // stub chrome（搜索框/通知铃铛等未接真的假部件）：接真前只在开发/demo 预览，
    // 生产交付隐藏，避免客户点到假按钮（诊断 F8）。demo 时 source.dev 亦为 true。
    showStubChrome: source.dev,
  };
}

export const featuresConfig = createFeatureConfig(env);
