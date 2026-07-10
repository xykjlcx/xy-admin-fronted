import { queryOptions } from '@tanstack/react-query';
import { defineApiContract } from '@/lib/http/contract';
import { http } from '@/lib/http/client';
import { carrierKeys } from './keys';
import { CarrierInputSchema, CarrierListSchema, CarrierSchema, type CarrierInput } from './schema';
const listContract = defineApiContract({ response: CarrierListSchema });
const detailContract = defineApiContract({ response: CarrierSchema });
export const carriersQuery = (keyword: string) =>
  queryOptions({
    queryKey: carrierKeys.list(keyword),
    queryFn: ({ signal }) => http.get('/api/lastmile/carriers', { keyword }, listContract, { signal }),
  });
export const carrierDetailQuery = (id: string) =>
  queryOptions({
    queryKey: carrierKeys.detail(id),
    queryFn: ({ signal }) => http.get(`/api/lastmile/carriers/${id}`, undefined, detailContract, { signal }),
  });
export const carrierApi = {
  create: (input: CarrierInput) =>
    http.post('/api/lastmile/carriers', CarrierInputSchema.parse(input), detailContract),
};
