import type { StatusBadgeTone } from '@/components/pro/StatusBadge';
import type { CreateUserInput, DeptDto, UserDto, UsersQueryParams } from '@/modules/admin/api/user.api';

export const statusOptions = [
  { value: 'all' },
  { value: 'active' },
  { value: 'disabled' },
  { value: 'unactivated' },
] satisfies { value: UsersQueryParams['status'] }[];

export const emptyDraft: CreateUserInput = {
  name: '',
  deptId: '',
  role: '',
  phone: '',
  email: '',
};

export const avatarClasses = [
  'bg-(--nav-item-fg-current)',
  'bg-warning',
  'bg-success',
  'bg-danger',
  'bg-(--nav-item-fg-current) text-white',
  'bg-warning text-white',
];

export const memberGridTemplate =
  'calc(44px * var(--app-scale)) 1.4fr 1fr 1.4fr 1fr calc(120px * var(--app-scale))';
export const deptGridTemplate = '1fr calc(120px * var(--app-scale))';

export function buildDepthMap(depts: DeptDto[]) {
  const byId = new Map(depts.map((dept) => [dept.id, dept]));
  const getDepth = (dept: DeptDto): number => {
    if (!dept.parentId) return 0;
    const parent = byId.get(dept.parentId);
    return parent ? getDepth(parent) + 1 : 0;
  };
  return new Map(depts.map((dept) => [dept.id, getDepth(dept)]));
}

export function statusTone(status: UserDto['status']): StatusBadgeTone {
  if (status === 'active') return 'success';
  if (status === 'unactivated') return 'warning';
  if (status === 'left') return 'danger';
  return 'neutral';
}

export function initials(name: string) {
  return name.slice(-2);
}
