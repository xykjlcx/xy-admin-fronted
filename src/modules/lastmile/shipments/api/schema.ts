import { z } from 'zod';

export const ShipmentStatusSchema = z.enum([
  'pending',
  'printed',
  'transit',
  'delivered',
  'exception',
  'returned',
]);
export const ShipmentFilterSchema = ShipmentStatusSchema.or(z.literal('all'));
export const ParcelSchema = z.object({
  id: z.string(),
  name: z.string(),
  hsCode: z.string(),
  quantity: z.number().int().positive(),
  weight: z.number().positive(),
  size: z.string(),
  declaredValue: z.number().nonnegative(),
});
export const AddressSchema = z.object({
  name: z.string(),
  phone: z.string(),
  country: z.string(),
  postalCode: z.string(),
  address: z.string(),
});
export const ShipmentSchema = z.object({
  id: z.string(),
  no: z.string(),
  customerId: z.string(),
  customer: z.string(),
  country: z.string(),
  channelId: z.string(),
  channel: z.string(),
  weight: z.number().positive(),
  fee: z.number().nonnegative(),
  status: ShipmentStatusSchema,
  trackingNo: z.string(),
  createdAt: z.string(),
  warehouse: z.string(),
  sender: AddressSchema,
  receiver: AddressSchema,
  parcels: z.array(ParcelSchema),
  services: z.array(z.string()),
  feeItems: z.array(z.object({ label: z.string(), amount: z.number() })),
  tracking: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      place: z.string(),
      occurredAt: z.string(),
      completed: z.boolean(),
      current: z.boolean(),
    }),
  ),
});
export const ShipmentListSchema = z.object({
  list: z.array(ShipmentSchema),
  total: z.number().int(),
  stats: z.record(ShipmentStatusSchema, z.number().int()),
});
export const ShipmentOptionSchema = z.object({ value: z.string(), label: z.string() });
export const ShipmentOptionsSchema = z.object({
  customers: z.array(ShipmentOptionSchema),
  channels: z.array(ShipmentOptionSchema),
  countries: z.array(ShipmentOptionSchema),
  warehouses: z.array(ShipmentOptionSchema),
});
export const CreateShipmentSchema = z.object({
  customerId: z.string().min(1),
  warehouse: z.string().min(1),
  recipient: z.string().trim().min(1),
  phone: z.string().trim().min(5),
  country: z.string().min(1),
  postalCode: z.string().trim().min(2),
  address: z.string().trim().min(3),
  channelId: z.string().min(1),
  services: z.array(z.string()),
  parcels: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        hsCode: z.string().trim().min(4),
        quantity: z.number().int().positive(),
        weight: z.number().positive(),
        size: z.string().trim().min(1),
        declaredValue: z.number().nonnegative(),
      }),
    )
    .min(1),
});
export const PrintShipmentInputSchema = z.object({
  printer: z.string().min(1),
  paper: z.string().min(1),
  copies: z.number().int().min(1).max(20),
  packingList: z.boolean(),
});
export const PrintResultSchema = z.object({ shipment: ShipmentSchema, printedAt: z.string() });

export type ShipmentDto = z.infer<typeof ShipmentSchema>;
export type ShipmentStatus = z.infer<typeof ShipmentStatusSchema>;
export type ShipmentFilter = z.infer<typeof ShipmentFilterSchema>;
export type ShipmentOptionsDto = z.infer<typeof ShipmentOptionsSchema>;
export type CreateShipmentInput = z.infer<typeof CreateShipmentSchema>;
export type PrintShipmentInput = z.infer<typeof PrintShipmentInputSchema>;
