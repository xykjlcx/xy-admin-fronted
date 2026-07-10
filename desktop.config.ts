export const desktopDefaults = {
  // 脚手架开发身份，派生项目发布前必须替换，不能作为正式发布者身份使用。
  appId: 'dev.unconfigured.admin-scaffold',
  productName: 'Admin Scaffold Development',
  executableName: 'admin-scaffold-development',
  releaseIdentityConfigured: false,
  development: {
    apiBaseUrl: 'http://127.0.0.1:5173',
    webPublicBaseUrl: 'http://127.0.0.1:5173',
    updateBaseUrl: 'https://updates.invalid',
  },
} as const;
