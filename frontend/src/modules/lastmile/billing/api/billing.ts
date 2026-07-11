import { queryOptions } from '@tanstack/react-query';
import { defineApiContract } from '@/lib/http/contract';
import { http } from '@/lib/http/client';
import { billingKeys } from './keys';
import { BillListSchema, type BillFilter } from './schema';
const contract = defineApiContract({ response: BillListSchema });
export const billsQuery = (keyword: string, status: BillFilter) =>
  queryOptions({
    queryKey: billingKeys.list(keyword, status),
    queryFn: ({ signal }) => http.get('/api/lastmile/billing', { keyword, status }, contract, { signal }),
  });
