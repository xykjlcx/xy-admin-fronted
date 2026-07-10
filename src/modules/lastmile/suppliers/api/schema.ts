import { z } from 'zod';
export const SupplierSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  type: z.string(),
  carriers: z.array(z.string()),
  credentialLabel: z.string(),
  baseUrl: z.string().url(),
  authType: z.string(),
  settlement: z.string(),
  enabled: z.boolean(),
  latency: z.number().int(),
  mappings: z.array(
    z.object({
      id: z.string(),
      carrier: z.string(),
      product: z.string(),
      services: z.string(),
      tracking: z.boolean(),
    }),
  ),
  channels: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      code: z.string(),
      carrier: z.string(),
      enabled: z.boolean(),
    }),
  ),
});
export const SupplierListSchema = z.object({ list: z.array(SupplierSchema), total: z.number().int() });
export const SupplierInputSchema = z.object({
  code: z.string().trim().min(2),
  name: z.string().trim().min(2),
  type: z.string().min(1),
  carriers: z.string().trim().min(1),
  credentialLabel: z.string().trim().min(2),
  baseUrl: z.string().url(),
  settlement: z.string().min(1),
});
export type SupplierDto = z.infer<typeof SupplierSchema>;
export type SupplierInput = z.infer<typeof SupplierInputSchema>;
