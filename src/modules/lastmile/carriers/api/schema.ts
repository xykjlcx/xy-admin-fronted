import { z } from 'zod';
export const CarrierSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  fullName: z.string(),
  region: z.string(),
  services: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      code: z.string(),
      tracking: z.boolean(),
      labelFormat: z.string(),
    }),
  ),
  channels: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      code: z.string(),
      supplier: z.string(),
      enabled: z.boolean(),
    }),
  ),
  enabled: z.boolean(),
});
export const CarrierListSchema = z.object({ list: z.array(CarrierSchema), total: z.number().int() });
export const CarrierInputSchema = z.object({
  code: z.string().trim().min(2),
  name: z.string().trim().min(2),
  fullName: z.string().trim().min(2),
  region: z.string().trim().min(2),
  serviceName: z.string().trim().min(2),
  serviceCode: z.string().trim().min(2),
});
export type CarrierDto = z.infer<typeof CarrierSchema>;
export type CarrierInput = z.infer<typeof CarrierInputSchema>;
