import { queryOptions } from '@tanstack/react-query';
import { defineApiContract } from '@/lib/http/contract';
import { http } from '@/lib/http/client';
import { supplierKeys } from './keys';
import { SupplierInputSchema, SupplierListSchema, SupplierSchema, type SupplierInput } from './schema';
const listContract = defineApiContract({ response: SupplierListSchema });
const detailContract = defineApiContract({ response: SupplierSchema });
export const suppliersQuery = (keyword: string) =>
  queryOptions({
    queryKey: supplierKeys.list(keyword),
    queryFn: ({ signal }) => http.get('/api/lastmile/suppliers', { keyword }, listContract, { signal }),
  });
export const supplierDetailQuery = (id: string) =>
  queryOptions({
    queryKey: supplierKeys.detail(id),
    queryFn: ({ signal }) => http.get(`/api/lastmile/suppliers/${id}`, undefined, detailContract, { signal }),
  });
export const supplierApi = {
  create: (input: SupplierInput) =>
    http.post('/api/lastmile/suppliers', SupplierInputSchema.parse(input), detailContract),
};
