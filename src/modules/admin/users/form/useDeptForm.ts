import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { DeptFormState } from '../types';

const DeptFormSchema = z.object({
  name: z.string().min(1),
  parentId: z.string(),
});

export type DeptFormValues = z.infer<typeof DeptFormSchema>;

export function useDeptForm({ state }: { state: DeptFormState }) {
  const defaultValues: DeptFormValues =
    state.kind === 'edit'
      ? { name: state.dept.name, parentId: state.dept.parentId ?? '' }
      : state.kind === 'createChild'
        ? { name: '', parentId: state.parent.id }
        : { name: '', parentId: '' };

  return useForm<DeptFormValues>({
    resolver: zodResolver(DeptFormSchema),
    mode: 'onChange',
    defaultValues,
  });
}
