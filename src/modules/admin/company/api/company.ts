import { queryOptions } from '@tanstack/react-query';
import { defineApiContract } from '@/lib/http/contract';
import { http } from '@/lib/http/client';
import { companyKeys } from './keys';
import { CompanySchema, UpdateCompanySchema, type UpdateCompanyInput } from './schema';

const contract = defineApiContract({ response: CompanySchema });
export const companyQuery = queryOptions({
  queryKey: companyKeys.detail(),
  staleTime: 5 * 60 * 1000,
  queryFn: ({ signal }) => http.get('/api/company', undefined, contract, { signal }),
});
export const companyApi = {
  update: (input: UpdateCompanyInput) => http.put('/api/company', UpdateCompanySchema.parse(input), contract),
};
