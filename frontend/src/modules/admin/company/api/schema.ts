import { z } from 'zod';

export const CompanyEmailSchema = z.string().trim().max(320).refine((email) => {
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  const [local = '', domain = ''] = parts;
  if (!local || local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false;
  if (!/^[A-Za-z0-9.!#$%&'*+/=?^_{}|~-]+$/.test(local)) return false;
  const labels = domain.split('.');
  return labels.length >= 2 && (labels.at(-1)?.length ?? 0) >= 2
    && labels.every((label) => /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/.test(label) && label.length <= 63);
}, 'Invalid email address');

export const CompanySchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1).max(200),
  verified: z.boolean(),
  domain: z.string().trim().min(1).max(253),
  code: z.string().trim().min(1).max(64),
  industry: z.string().trim().min(1).max(200),
  scale: z.string().trim().min(1).max(64),
  dataResidency: z.string().trim().min(1).max(128),
  createdAt: z.string(),
  contactName: z.string().trim().min(1).max(128),
  contactEmail: CompanyEmailSchema,
  contactPhone: z.string().trim().min(1).max(64),
  landline: z.string().trim().max(64),
  address: z.string().trim().min(1).max(512),
  postalCode: z.string().trim().min(1).max(32),
});
export const UpdateCompanySchema = CompanySchema.omit({ id: true });

export type CompanyDto = z.infer<typeof CompanySchema>;
export type UpdateCompanyInput = z.infer<typeof UpdateCompanySchema>;
