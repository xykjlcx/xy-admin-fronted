import type { ShipmentFilter } from './api';

export interface ShipmentListSearch {
  keyword: string;
  status: ShipmentFilter;
}
export type ShipmentDetailTab = 'basic' | 'parcel' | 'fee' | 'track';
