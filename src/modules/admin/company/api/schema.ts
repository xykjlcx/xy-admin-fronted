import { z } from 'zod';

export const CompanySchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1),
  verified: z.boolean(),
  domain: z.string().trim().min(1),
  code: z.string().trim().min(1),
  industry: z.string().trim().min(1),
  scale: z.string().trim().min(1),
  dataResidency: z.string().trim().min(1),
  createdAt: z.string(),
  contactName: z.string().trim().min(1),
  contactEmail: z.string().trim().email(),
  contactPhone: z.string().trim().min(1),
  landline: z.string().trim(),
  address: z.string().trim().min(1),
  postalCode: z.string().trim().min(1),
});
export const UpdateCompanySchema = CompanySchema.omit({ id: true });

export type CompanyDto = z.infer<typeof CompanySchema>;
export type UpdateCompanyInput = z.infer<typeof UpdateCompanySchema>;
