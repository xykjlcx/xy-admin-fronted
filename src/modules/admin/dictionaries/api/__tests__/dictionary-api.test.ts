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
