import { z } from 'zod';
export const BillStatusSchema = z.enum(['pending', 'paid', 'overdue']);
export const BillFilterSchema = BillStatusSchema.or(z.literal('all'));
export const BillSchema = z.object({
  id: z.string(),
  no: z.string(),
  customer: z.string(),
  period: z.string(),
  shipments: z.number().int(),
  amount: z.number(),
  status: BillStatusSchema,
});
export const BillListSchema = z.object({
  list: z.array(BillSchema),
  total: z.number().int(),
  receivable: z.number(),
});
export type BillDto = z.infer<typeof BillSchema>;
export type BillFilter = z.infer<typeof BillFilterSchema>;
