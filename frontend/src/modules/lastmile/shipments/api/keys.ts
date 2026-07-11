import type { ShipmentFilter } from './schema';

export const shipmentKeys = {
  all: ['lastmile', 'shipments'] as const,
  lists: () => [...shipmentKeys.all, 'list'] as const,
  list: (keyword: string, status: ShipmentFilter) => [...shipmentKeys.lists(), { keyword, status }] as const,
  details: () => [...shipmentKeys.all, 'detail'] as const,
  detail: (id: string) => [...shipmentKeys.details(), id] as const,
  options: () => [...shipmentKeys.all, 'options'] as const,
};
