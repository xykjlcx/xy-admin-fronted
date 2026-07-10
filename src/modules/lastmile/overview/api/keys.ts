export const overviewKeys = {
  all: ['lastmile', 'overview'] as const,
  detail: () => [...overviewKeys.all, 'detail'] as const,
};
