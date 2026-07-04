import type {
  CreateUserInput,
  DeptDto,
  PageResult,
  UpdateUserInput,
  UserDto,
  UsersQueryParams,
} from '@/modules/admin/api/user.api';

export interface UsersViewProps {
  permissions: string[];
  depts: DeptDto[];
  usersPage?: PageResult<UserDto>;
  usersLoading?: boolean;
  usersRefreshing?: boolean;
  search: UsersQueryParams;
  onSearchChange: (patch: Partial<UsersQueryParams>) => void;
  onCreateUser: (dto: CreateUserInput) => void | Promise<void>;
  onUpdateUser: (id: string, dto: UpdateUserInput) => void | Promise<void>;
  onDeleteUser: (id: string) => void | Promise<void>;
  onBatchDisable: (ids: string[]) => void | Promise<void>;
}

export type TabKey = 'members' | 'depts' | 'left';
export type UserFormState = { kind: 'closed' } | { kind: 'create' } | { kind: 'edit'; user: UserDto };
