import type { BillFilter } from './schema';
export const billingKeys = {
  all: ['lastmile', 'billing'] as const,
  list: (keyword: string, status: BillFilter) => [...billingKeys.all, { keyword, status }] as const,
};
