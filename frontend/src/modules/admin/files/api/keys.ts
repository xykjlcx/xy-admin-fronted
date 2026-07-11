export const fileKeys = {
  all: ['admin', 'files'] as const,
  list: (parentId: string | null, keyword: string) =>
    [...fileKeys.all, 'list', { parentId, keyword }] as const,
  detail: (id: string) => [...fileKeys.all, 'detail', id] as const,
  storage: () => [...fileKeys.all, 'storage'] as const,
};
