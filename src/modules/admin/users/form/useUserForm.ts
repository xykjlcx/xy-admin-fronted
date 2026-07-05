import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { CreateUserSchema, type CreateUserInput, type DeptDto, type UserDto } from '../api';

interface UseUserFormParams {
  user: UserDto | null;
  depts: DeptDto[];
}

export function useUserForm({ user, depts }: UseUserFormParams) {
  const firstDeptId = depts[0]?.id ?? '';

  return useForm<CreateUserInput>({
    resolver: zodResolver(CreateUserSchema),
    mode: 'onChange',
    defaultValues: user
      ? {
          name: user.name,
          deptId: user.deptId,
          role: user.role,
          phone: user.phone,
          email: user.email,
        }
      : {
          name: '',
          deptId: firstDeptId,
          role: '',
          phone: '',
          email: '',
        },
  });
}
