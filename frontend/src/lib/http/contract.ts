import { z } from 'zod';

// API contract 是“后端响应 shape”的运行时边界。
// 类型从 zod schema 推导，避免 DTO、mock、真实接口三套结构各写各的后慢慢漂移。
export type ResponseKind = 'json' | 'void' | 'blob';

export interface BlobResult {
  blob: Blob;
  filename: string | null;
  contentType: string | null;
}

export interface JsonApiContract<T> {
  responseKind: 'json';
  response: z.ZodTypeAny;
  parse: (data: unknown) => T;
}

export interface VoidApiContract<T = void> {
  responseKind: 'void';
  parse: (data: unknown) => T;
}

export interface BlobApiContract<T = BlobResult> {
  responseKind: 'blob';
  parse: (data: unknown) => T;
}

export type ApiContract<T> = JsonApiContract<T> | VoidApiContract<T> | BlobApiContract<T>;

export function defineApiContract<const TSchema extends z.ZodTypeAny>({
  response,
}: {
  response: TSchema;
}): JsonApiContract<z.infer<TSchema>> {
  return { responseKind: 'json', response, parse: (data) => response.parse(data) };
}

export function defineVoidContract(): VoidApiContract {
  return { responseKind: 'void', parse: () => undefined };
}

const blobResultSchema = z.object({
  blob: z.instanceof(Blob),
  filename: z.string().nullable(),
  contentType: z.string().nullable(),
});

export const blobContract: BlobApiContract = {
  responseKind: 'blob',
  parse: (data) => blobResultSchema.parse(data),
};

export function pageResultSchema<TSchema extends z.ZodTypeAny>(item: TSchema) {
  // 后台列表统一使用 { list, total }，表格页只关心分页协议，不关心具体资源类型。
  return z.object({
    list: z.array(item),
    total: z.number(),
  });
}
