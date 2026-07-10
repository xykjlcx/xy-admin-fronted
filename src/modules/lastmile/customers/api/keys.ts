export const customerKeys = {
  all: ['lastmile', 'customers'] as const,
  lists: () => [...customerKeys.all, 'list'] as const,
  list: (keyword: string) => [...customerKeys.lists(), keyword] as const,
  details: () => [...customerKeys.all, 'detail'] as const,
  detail: (id: string) => [...customerKeys.details(), id] as const,
};
