// 防腐层：接真后端只改此文件（spec §5.2）
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
