export const dictionaryKeys = {
  all: ['system', 'dictionaries'] as const,
  list: () => [...dictionaryKeys.all, 'list'] as const,
  items: (dictionaryId: string) => [...dictionaryKeys.all, 'items', dictionaryId] as const,
};
