import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { http } from '@/lib/http/client';
import { defineApiContract } from '@/lib/http/contract';
import {
  CreateDeptSchema,
  DeptSchema,
  UpdateDeptSchema,
  type CreateDeptInput,
  type UpdateDeptInput,
} from './schema';
import { deptKeys, userKeys } from './keys';

const deptsContract = defineApiContract({ response: z.array(DeptSchema) });
const deptContract = defineApiContract({ response: DeptSchema });

export const deptsQuery = queryOptions({
  queryKey: deptKeys.all,
  staleTime: 5 * 60 * 1000,
  queryFn: () => http.get('/api/depts', undefined, deptsContract),
});

export const deptApi = {
  createDept: (dto: CreateDeptInput) => http.post('/api/depts', CreateDeptSchema.parse(dto), deptContract),
  updateDept: (id: string, dto: UpdateDeptInput) =>
    http.put(`/api/depts/${id}`, UpdateDeptSchema.parse(dto), deptContract),
};

export function useDeptMutations() {
  const qc = useQueryClient();
  const invalidate = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: deptKeys.all }),
      qc.invalidateQueries({ queryKey: userKeys.all }),
    ]);
  const createDept = useMutation({ mutationFn: deptApi.createDept, onSuccess: invalidate });
  const updateDept = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateDeptInput }) => deptApi.updateDept(id, dto),
    onSuccess: invalidate,
  });

  return { createDept, updateDept };
}
