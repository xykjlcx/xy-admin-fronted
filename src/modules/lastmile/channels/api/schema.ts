import { z } from 'zod';

export const ChannelKindSchema = z.enum(['express', 'line', 'postal', 'self']);
export const ChannelKindFilterSchema = ChannelKindSchema.or(z.literal('all'));
export const ChannelStatusFilterSchema = z.enum(['all', 'enabled', 'disabled']);
export const ChannelSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  kind: ChannelKindSchema,
  supplierId: z.string(),
  supplier: z.string(),
  carrierId: z.string(),
  carrier: z.string(),
  service: z.string(),
  countries: z.array(z.string()),
  accountOwner: z.enum(['platform', 'enterprise', 'self']),
  settlement: z.string(),
  cost: z.number().nonnegative(),
  price: z.number().nonnegative(),
  priority: z.number().int().positive(),
  enabled: z.boolean(),
  updatedAt: z.string(),
  api: z.object({
    baseUrl: z.string().url(),
    productCode: z.string(),
    accountNo: z.string(),
    labelFormat: z.string(),
    tracking: z.boolean(),
    latency: z.number().int().nonnegative(),
  }),
  regions: z.array(
    z.object({
      id: z.string(),
      group: z.string(),
      postalRange: z.string(),
      weightRange: z.string(),
      transitTime: z.string(),
      remote: z.boolean(),
      enabled: z.boolean(),
    }),
  ),
  quotes: z.array(
    z.object({
      id: z.string(),
      country: z.string(),
      weightRange: z.string(),
      cost: z.number(),
      price: z.number(),
      fuel: z.number(),
      remote: z.number(),
      effectiveAt: z.string(),
    }),
  ),
  logs: z.array(
    z.object({
      id: z.string(),
      occurredAt: z.string(),
      operator: z.string(),
      type: z.string(),
      change: z.string(),
      note: z.string(),
    }),
  ),
});
export const ChannelStatsSchema = z.object({
  total: z.number().int().nonnegative(),
  enabled: z.number().int().nonnegative(),
  countries: z.number().int().nonnegative(),
  today: z.number().int().nonnegative(),
  successRate: z.number().min(0).max(100),
});
export const ChannelListSchema = z.object({
  list: z.array(ChannelSchema),
  total: z.number().int(),
  stats: ChannelStatsSchema,
});
export const ChannelOptionsSchema = z.object({
  suppliers: z.array(
    z.object({
      value: z.string(),
      label: z.string(),
      carriers: z.array(z.object({ value: z.string(), label: z.string(), services: z.array(z.string()) })),
    }),
  ),
  countries: z.array(z.object({ value: z.string(), label: z.string() })),
});
export const ChannelInputSchema = z.object({
  name: z.string().trim().min(2),
  code: z.string().trim().min(3),
  kind: ChannelKindSchema,
  supplierId: z.string().min(1),
  carrierId: z.string().min(1),
  service: z.string().min(1),
  countries: z.array(z.string()).min(1),
  accountOwner: z.enum(['platform', 'enterprise', 'self']),
  settlement: z.string().min(1),
  priority: z.number().int().positive(),
  baseUrl: z.string().url(),
  apiKey: z.string().min(4),
  labelFormat: z.string().min(1),
  timeout: z.number().int().min(1).max(120),
});
export const ChannelDraftSchema = ChannelInputSchema.extend({
  name: z.string(),
  code: z.string(),
  supplierId: z.string(),
  carrierId: z.string(),
  service: z.string(),
  countries: z.array(z.string()),
  settlement: z.string(),
  priority: z.number(),
  baseUrl: z.string(),
  apiKey: z.string(),
  labelFormat: z.string(),
  timeout: z.number(),
});
export const ChannelToggleSchema = z.object({ enabled: z.boolean() });
export const ChannelBatchSchema = z.object({ ids: z.array(z.string()).min(1) });
export const ChannelTestResultSchema = z.object({
  ok: z.literal(true),
  latency: z.number().int().positive(),
  testedAt: z.string(),
});

export type ChannelDto = z.infer<typeof ChannelSchema>;
export type ChannelKind = z.infer<typeof ChannelKindSchema>;
export type ChannelKindFilter = z.infer<typeof ChannelKindFilterSchema>;
export type ChannelStatusFilter = z.infer<typeof ChannelStatusFilterSchema>;
export type ChannelInput = z.infer<typeof ChannelInputSchema>;
