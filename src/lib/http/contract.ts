import { z } from 'zod';

// API contract 是“后端响应 shape”的运行时边界。
// 类型从 zod schema 推导，避免 DTO、mock、真实接口三套结构各写各的后慢慢漂移。
export interface ApiContract<T> {
  response: z.ZodTypeAny;
  parse: (data: unknown) => T;
}

export function defineApiContract<const TSchema extends z.ZodTypeAny>({
  response,
}: {
  response: TSchema;
}): ApiContract<z.infer<TSchema>> {
  return { response, parse: (data) => response.parse(data) };
}

export function pageResultSchema<TSchema extends z.ZodTypeAny>(item: TSchema) {
  // 后台列表统一使用 { list, total }，表格页只关心分页协议，不关心具体资源类型。
  return z.object({
    list: z.array(item),
    total: z.number(),
  });
}
