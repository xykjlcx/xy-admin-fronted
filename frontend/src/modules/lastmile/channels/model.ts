import type { ChannelKind } from './api';
import type { StatusBadgeTone } from '@/components/pro/StatusBadge';
export const channelKindTone: Record<ChannelKind, StatusBadgeTone> = {
  express: 'neutral',
  line: 'warning',
  postal: 'neutral',
  self: 'success',
};
export function money(value: number) {
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(value);
}
