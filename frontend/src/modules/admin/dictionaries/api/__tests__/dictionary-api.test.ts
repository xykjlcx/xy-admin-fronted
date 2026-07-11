import * as dictionaryModule from '@/modules/admin/dictionaries/api';

test('dictionary queries share the package key factory', () => {
  const moduleRecord = dictionaryModule as Record<string, unknown>;
  expect(moduleRecord).toHaveProperty('dictionariesQuery');
  expect(moduleRecord).toHaveProperty('dictionaryItemsQuery');

  const queryModule = dictionaryModule as typeof dictionaryModule & {
    dictionariesQuery: { queryKey: readonly unknown[] };
    dictionaryItemsQuery: (dictionaryId: string) => { queryKey: readonly unknown[] };
  };
  expect(queryModule.dictionariesQuery.queryKey).toEqual(dictionaryModule.dictionaryKeys.list());
  expect(queryModule.dictionaryItemsQuery('dict-user-status').queryKey).toEqual(
    dictionaryModule.dictionaryKeys.items('dict-user-status'),
  );
});

test('dictionary api exposes all catalog and item mutations', () => {
  const api = (dictionaryModule as Record<string, unknown>).dictionaryApi as
    Record<string, unknown> | undefined;
  expect(api).toBeDefined();
  for (const operation of [
    'createDictionary',
    'updateDictionary',
    'deleteDictionary',
    'createItem',
    'updateItem',
    'setItemEnabled',
    'deleteItem',
  ]) {
    expect(typeof api?.[operation], operation).toBe('function');
  }
});

test('dictionary writes reject values wider than V10 columns', () => {
  expect(dictionaryModule.CreateDictionarySchema.safeParse({ name: 'n'.repeat(129), code: 'ok', remark: '', builtin: false }).success).toBe(false);
  expect(dictionaryModule.CreateDictionarySchema.safeParse({ name: 'ok', code: `a${'b'.repeat(128)}`, remark: '', builtin: false }).success).toBe(false);
  expect(dictionaryModule.CreateDictionarySchema.safeParse({ name: 'ok', code: 'ok', remark: 'r'.repeat(513), builtin: false }).success).toBe(false);
  expect(dictionaryModule.CreateDictionaryItemSchema.safeParse({ label: 'l'.repeat(129), value: 'ok', sort: 0, enabled: true, color: 'neutral', remark: '' }).success).toBe(false);
  expect(dictionaryModule.CreateDictionaryItemSchema.safeParse({ label: 'ok', value: 'v'.repeat(129), sort: 0, enabled: true, color: 'neutral', remark: '' }).success).toBe(false);
});
