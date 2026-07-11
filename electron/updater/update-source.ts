export function createUpdateFeedUrl(baseUrl: string, platform: string, arch: string): string {
  const supported =
    (platform === 'darwin' && (arch === 'arm64' || arch === 'x64')) ||
    (platform === 'win32' && arch === 'x64');
  if (!supported) throw new Error(`不支持的更新平台: ${platform}/${arch}`);

  const base = new URL(baseUrl);
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash) {
    throw new Error('更新源必须是无凭据、无 query/hash 的 HTTPS URL');
  }
  const normalizedBase = base.toString().endsWith('/') ? base.toString() : `${base.toString()}/`;
  return new URL(`stable/${platform}/${arch}/`, normalizedBase).toString();
}
