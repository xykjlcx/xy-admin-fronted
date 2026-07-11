import { queryOptions } from '@tanstack/react-query';
import { defineApiContract } from '@/lib/http/contract';
import { http } from '@/lib/http/client';
import { overviewKeys } from './keys';
import { OverviewSchema } from './schema';

const contract = defineApiContract({ response: OverviewSchema });

export const overviewQuery = queryOptions({
  queryKey: overviewKeys.detail(),
  queryFn: ({ signal }) => http.get('/api/lastmile/overview', undefined, contract, { signal }),
});
