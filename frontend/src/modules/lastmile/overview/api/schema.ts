import { z } from 'zod';

export const OverviewStatSchema = z.object({
  key: z.enum(['pending', 'transit', 'todayFee', 'month']),
  value: z.string(),
  hint: z.string(),
});
export const RecentShipmentSchema = z.object({
  id: z.string(),
  no: z.string(),
  customer: z.string(),
  country: z.string(),
  channel: z.string(),
  status: z.enum(['pending', 'printed', 'transit', 'delivered', 'exception', 'returned']),
});
export const ChannelUsageSchema = z.object({
  name: z.string(),
  count: z.number().int().nonnegative(),
  percent: z.number().min(0).max(100),
});
export const OverviewSchema = z.object({
  stats: z.array(OverviewStatSchema),
  recent: z.array(RecentShipmentSchema),
  channelUsage: z.array(ChannelUsageSchema),
});

export type OverviewDto = z.infer<typeof OverviewSchema>;
