// 共享 envelope helper，供各域 handlers 复用（对齐 src/lib/http/client.ts 的 { code, data, message } 契约）
import { HttpResponse } from 'msw';

export const ok = <T>(data: T) => HttpResponse.json({ code: 0, data, message: '' });
export const biz = (code: number, message: string) => HttpResponse.json({ code, data: null, message });
