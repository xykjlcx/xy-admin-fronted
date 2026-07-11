import type { CustomerStatus } from './api';
import type { StatusBadgeTone } from '@/components/pro/StatusBadge';
export const customerTone: Record<CustomerStatus, StatusBadgeTone> = {
  active: 'success',
  trial: 'neutral',
  overdue: 'danger',
  suspended: 'neutral',
};
export function money(value: number) {
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(value);
}
