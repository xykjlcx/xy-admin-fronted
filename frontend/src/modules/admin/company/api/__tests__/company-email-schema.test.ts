import { describe, expect, it } from 'vitest';
import { CompanyEmailSchema, UpdateCompanySchema } from '../schema';

describe('CompanyEmailSchema', () => {
  it.each([
    ['a@example-.com', false],
    ['a@example.c', false],
    ['.alice@example.com', false],
    ['alice..x@example.com', false],
    ['a@example.com', true],
  ])('%s validity is %s', (email, valid) => {
    expect(CompanyEmailSchema.safeParse(email).success).toBe(valid);
  });
});

it('rejects every value wider than its V10 company column', () => {
  const valid = {
    name: 'MetaBuilder', verified: false, domain: 'meta.test', code: 'META', industry: 'Software',
    scale: '1-49', dataResidency: 'China', createdAt: '2026-01-01', contactName: 'Admin',
    contactEmail: 'admin@meta.test', contactPhone: '1', landline: '', address: 'Shanghai', postalCode: '200000',
  };
  for (const [field, size] of Object.entries({ name: 201, domain: 254, code: 65, industry: 201, scale: 65, dataResidency: 129, contactName: 129, contactEmail: 321, contactPhone: 65, landline: 65, address: 513, postalCode: 33 })) {
    expect(UpdateCompanySchema.safeParse({ ...valid, [field]: 'a'.repeat(size) }).success, field).toBe(false);
  }
});
