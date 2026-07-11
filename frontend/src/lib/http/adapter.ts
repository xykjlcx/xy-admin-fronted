// 防腐层：接真后端只改此文件（spec §5.2）
// 接真后端备忘：
// ① 401 目前无条件 emit expired；若后端对登录失败（用户名密码错）也回 401，需改为仅在带 token 的请求上 emit
// ② 上传 multipart 走 envelope 外的例外协议时，需要导出 authHeader 助手供上传请求单独拼 header（不走 request() 这条 envelope 路径）
export interface Envelope<T> {
  code: number;
  data: T;
  message: string;
}
export const adapter = {
  mapRequestParams: (p: Record<string, unknown>) => p, // 如 page→pageNum 在此改写
  parseEnvelope: <T>(json: unknown): Envelope<T> => json as Envelope<T>, // 多形状归一在此
  isOk: (code: number) => code === 0, // code 语义（200 vs 0）在此
  mapPermission: (code: string) => code, // 权限符映射钩子（spec §7.5）
};
