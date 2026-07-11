export const carrierKeys = {
  all: ['lastmile', 'carriers'] as const,
  lists: () => [...carrierKeys.all, 'list'] as const,
  list: (keyword: string) => [...carrierKeys.lists(), keyword] as const,
  details: () => [...carrierKeys.all, 'detail'] as const,
  detail: (id: string) => [...carrierKeys.details(), id] as const,
};
