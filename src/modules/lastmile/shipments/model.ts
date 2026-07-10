import type { ShipmentStatus } from './api';
import type { StatusBadgeTone } from '@/components/pro/StatusBadge';

export const shipmentTone: Record<ShipmentStatus, StatusBadgeTone> = {
  pending: 'warning',
  printed: 'neutral',
  transit: 'neutral',
  delivered: 'success',
  exception: 'danger',
  returned: 'neutral',
};
export function money(value: number) {
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(value);
}
