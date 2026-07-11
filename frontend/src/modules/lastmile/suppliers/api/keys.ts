export const supplierKeys = {
  all: ['lastmile', 'suppliers'] as const,
  lists: () => [...supplierKeys.all, 'list'] as const,
  list: (keyword: string) => [...supplierKeys.lists(), keyword] as const,
  details: () => [...supplierKeys.all, 'detail'] as const,
  detail: (id: string) => [...supplierKeys.details(), id] as const,
};
