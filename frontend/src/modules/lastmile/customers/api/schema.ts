import { z } from 'zod';

export const CustomerStatusSchema = z.enum(['active', 'trial', 'overdue', 'suspended']);
export const CustomerChannelSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  carrier: z.string(),
  authorized: z.boolean(),
});
export const CustomerSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  type: z.string(),
  channels: z.array(CustomerChannelSchema),
  pricingPlan: z.string(),
  balance: z.number(),
  credit: z.number().nonnegative(),
  status: CustomerStatusSchema,
  contact: z.string(),
  phone: z.string(),
  email: z.string().email(),
  registeredAt: z.string(),
  priceRows: z.array(
    z.object({
      channel: z.string(),
      weightRange: z.string(),
      base: z.number(),
      markup: z.number(),
      final: z.number(),
    }),
  ),
  transactions: z.array(
    z.object({
      id: z.string(),
      occurredAt: z.string(),
      type: z.enum(['charge', 'recharge']),
      description: z.string(),
      amount: z.number(),
      balance: z.number(),
    }),
  ),
});
export const CustomerListSchema = z.object({ list: z.array(CustomerSchema), total: z.number().int() });
export const CreateCustomerSchema = z.object({
  name: z.string().trim().min(2),
  code: z.string().trim().min(2),
  type: z.string().min(1),
  contact: z.string().trim().min(1),
  phone: z.string().trim().min(5),
  email: z.string().email(),
  credit: z.number().nonnegative(),
});
export const CustomerAuthorizationSchema = z.object({ channelId: z.string(), authorized: z.boolean() });

export type CustomerDto = z.infer<typeof CustomerSchema>;
export type CustomerStatus = z.infer<typeof CustomerStatusSchema>;
export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;
