import { http } from 'msw';
import { biz, ok, noContent } from '@/mocks/http';
import { genId } from '@/mocks/db';
import {
  CreateDictionaryItemSchema,
  CreateDictionarySchema,
  SetDictionaryItemEnabledSchema,
  UpdateDictionaryItemSchema,
  UpdateDictionarySchema,
} from '../api';
import { dictionaries, dictionaryItems } from './db';

export const dictionaryHandlers = [
  http.get('/api/dictionaries', () => ok(dictionaries.all())),
  http.post('/api/dictionaries', async ({ request }) => {
    const parsed = CreateDictionarySchema.safeParse(await request.json());
    if (!parsed.success) return biz({ status: 400, code: 'dictionary.validation.invalid', detail: '字典信息不完整' });
    if (dictionaries.all().some((dictionary) => dictionary.code === parsed.data.code)) {
      return biz({ status: 409, code: 'dictionary.code.conflict', detail: '字典编码已存在' });
    }
    return ok(dictionaries.insert({ id: genId('dict'), ...parsed.data }));
  }),
  http.put('/api/dictionaries/:id', async ({ params, request }) => {
    const id = String(params.id);
    if (!dictionaries.find(id)) return biz({ status: 404, code: 'dictionary.not-found', detail: '字典不存在' });
    const parsed = UpdateDictionarySchema.safeParse(await request.json());
    if (!parsed.success) return biz({ status: 400, code: 'dictionary.validation.invalid', detail: '字典信息不完整' });
    return ok(dictionaries.update(id, parsed.data));
  }),
  http.delete('/api/dictionaries/:id', ({ params }) => {
    const id = String(params.id);
    const dictionary = dictionaries.find(id);
    if (!dictionary) return biz({ status: 404, code: 'dictionary.not-found', detail: '字典不存在' });
    if (dictionary.builtin) return biz({ status: 409, code: 'dictionary.builtin.protected', detail: '内置字典不可删除' });
    dictionaries.remove(id);
    for (const item of dictionaryItems.filter((entry) => entry.dictionaryId === id))
      dictionaryItems.remove(item.id);
    return noContent();
  }),
  http.get('/api/dictionaries/:id/items', ({ params }) => {
    const dictionaryId = String(params.id);
    if (!dictionaries.find(dictionaryId)) return biz({ status: 404, code: 'dictionary.not-found', detail: '字典不存在' });
    return ok(
      dictionaryItems
        .filter((item) => item.dictionaryId === dictionaryId)
        .sort((left, right) => left.sort - right.sort),
    );
  }),
  http.post('/api/dictionaries/:id/items', async ({ params, request }) => {
    const dictionaryId = String(params.id);
    if (!dictionaries.find(dictionaryId)) return biz({ status: 404, code: 'dictionary.not-found', detail: '字典不存在' });
    const parsed = CreateDictionaryItemSchema.safeParse(await request.json());
    if (!parsed.success) return biz({ status: 400, code: 'dictionary.item.validation.invalid', detail: '字典项信息不完整' });
    if (
      dictionaryItems
        .filter((item) => item.dictionaryId === dictionaryId)
        .some((item) => item.value === parsed.data.value)
    ) {
      return biz({ status: 409, code: 'dictionary.item.value-conflict', detail: '字典值已存在' });
    }
    return ok(dictionaryItems.insert({ id: genId('dict-item'), dictionaryId, ...parsed.data }));
  }),
  http.put('/api/dictionaries/:dictionaryId/items/:itemId', async ({ params, request }) => {
    const dictionaryId = String(params.dictionaryId);
    const itemId = String(params.itemId);
    const current = dictionaryItems.find(itemId);
    if (!current || current.dictionaryId !== dictionaryId) return biz({ status: 404, code: 'dictionary.item.not-found', detail: '字典项不存在' });
    const parsed = UpdateDictionaryItemSchema.safeParse(await request.json());
    if (!parsed.success) return biz({ status: 400, code: 'dictionary.item.validation.invalid', detail: '字典项信息不完整' });
    if (
      dictionaryItems
        .filter((item) => item.dictionaryId === dictionaryId && item.id !== itemId)
        .some((item) => item.value === parsed.data.value)
    ) {
      return biz({ status: 409, code: 'dictionary.item.value-conflict', detail: '字典值已存在' });
    }
    return ok(dictionaryItems.update(itemId, parsed.data));
  }),
  http.patch('/api/dictionaries/:dictionaryId/items/:itemId/enabled', async ({ params, request }) => {
    const dictionaryId = String(params.dictionaryId);
    const itemId = String(params.itemId);
    const current = dictionaryItems.find(itemId);
    if (!current || current.dictionaryId !== dictionaryId) return biz({ status: 404, code: 'dictionary.item.not-found', detail: '字典项不存在' });
    const parsed = SetDictionaryItemEnabledSchema.safeParse(await request.json());
    if (!parsed.success) return biz({ status: 400, code: 'dictionary.status.invalid', detail: '启用状态不合法' });
    return ok(dictionaryItems.update(itemId, parsed.data));
  }),
  http.delete('/api/dictionaries/:dictionaryId/items/:itemId', ({ params }) => {
    const dictionaryId = String(params.dictionaryId);
    const itemId = String(params.itemId);
    const current = dictionaryItems.find(itemId);
    if (!current || current.dictionaryId !== dictionaryId) return biz({ status: 404, code: 'dictionary.item.not-found', detail: '字典项不存在' });
    dictionaryItems.remove(itemId);
    return noContent();
  }),
];

export { dictionaries, dictionaryItems } from './db';
