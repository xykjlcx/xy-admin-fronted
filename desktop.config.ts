import { z } from 'zod';

const DesktopPackagingConfigSchema = z
  .object({
    appId: z
      .string()
      .min(3)
      .max(160)
      .regex(/^[A-Za-z][A-Za-z0-9-]*(?:\.[A-Za-z0-9-]+)+$/, 'appId 必须是反向域名'),
    productName: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .refine((value) => !/[\\/\p{Cc}]/u.test(value), 'productName 包含非法字符'),
    executableName: z
      .string()
      .min(1)
      .max(80)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'executableName 必须是小写 kebab-case'),
    copyright: z.string().trim().min(1).max(240),
    releaseIdentityConfigured: z.boolean(),
    macTeamId: z
      .string()
      .regex(/^[A-Z0-9]{10}$/)
      .nullable(),
    windowsPublisher: z.string().trim().min(1).max(160).nullable(),
    development: z
      .object({
        apiBaseUrl: z.url(),
        webPublicBaseUrl: z.url(),
        updateBaseUrl: z.url(),
      })
      .strict(),
  })
  .strict();

export type DesktopPackagingConfig = z.infer<typeof DesktopPackagingConfigSchema>;

export const desktopDefaults = {
  // 脚手架开发身份，派生项目发布前必须替换，不能作为正式发布者身份使用。
  appId: 'dev.unconfigured.admin-scaffold',
  productName: 'Admin Scaffold Development',
  executableName: 'admin-scaffold-development',
  copyright: 'Copyright © Unconfigured Scaffold Owner',
  releaseIdentityConfigured: false,
  macTeamId: null,
  windowsPublisher: null,
  development: {
    apiBaseUrl: 'http://127.0.0.1:5173',
    webPublicBaseUrl: 'http://127.0.0.1:5173',
    updateBaseUrl: 'https://updates.invalid',
  },
} as const;

export function parseDesktopPackagingConfig(input: unknown): DesktopPackagingConfig {
  return DesktopPackagingConfigSchema.parse(input);
}

export function requireReleaseIdentity(input: unknown, platform: 'darwin' | 'win32'): DesktopPackagingConfig {
  const config = parseDesktopPackagingConfig(input);
  const placeholder = /(?:unconfigured|development|scaffold)/i.test(
    `${config.appId} ${config.productName} ${config.executableName} ${config.copyright}`,
  );
  if (!config.releaseIdentityConfigured || placeholder) {
    throw new Error(`${platform === 'darwin' ? 'macOS' : 'Windows'} 发布身份尚未配置`);
  }
  if (platform === 'darwin' && !config.macTeamId) throw new Error('macOS 发布身份缺少 Team ID');
  if (platform === 'win32' && !config.windowsPublisher) {
    throw new Error('Windows 发布身份缺少 publisher');
  }
  return config;
}
