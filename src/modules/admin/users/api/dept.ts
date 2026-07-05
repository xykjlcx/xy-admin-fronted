import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';
import { http } from '@/lib/http/client';
import { defineApiContract } from '@/lib/http/contract';
import { DeptSchema } from './schema';
import { deptKeys } from './keys';

const deptsContract = defineApiContract({ response: z.array(DeptSchema) });

export const deptsQuery = queryOptions({
  queryKey: deptKeys.all,
  staleTime: 5 * 60 * 1000,
  queryFn: () => http.get('/api/depts', undefined, deptsContract),
});
