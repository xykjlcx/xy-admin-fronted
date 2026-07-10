import { queryOptions } from '@tanstack/react-query';
import { defineApiContract } from '@/lib/http/contract';
import { http } from '@/lib/http/client';
import { customerKeys } from './keys';
import {
  CreateCustomerSchema,
  CustomerAuthorizationSchema,
  CustomerListSchema,
  CustomerSchema,
  type CreateCustomerInput,
} from './schema';

const listContract = defineApiContract({ response: CustomerListSchema });
const detailContract = defineApiContract({ response: CustomerSchema });
export const customersQuery = (keyword: string) =>
  queryOptions({
    queryKey: customerKeys.list(keyword),
    queryFn: ({ signal }) => http.get('/api/lastmile/customers', { keyword }, listContract, { signal }),
  });
export const customerDetailQuery = (id: string) =>
  queryOptions({
    queryKey: customerKeys.detail(id),
    queryFn: ({ signal }) => http.get(`/api/lastmile/customers/${id}`, undefined, detailContract, { signal }),
  });
export const customerApi = {
  create: (input: CreateCustomerInput) =>
    http.post('/api/lastmile/customers', CreateCustomerSchema.parse(input), detailContract),
  authorize: (id: string, channelId: string, authorized: boolean) =>
    http.patch(
      `/api/lastmile/customers/${id}/channels`,
      CustomerAuthorizationSchema.parse({ channelId, authorized }),
      detailContract,
    ),
};
