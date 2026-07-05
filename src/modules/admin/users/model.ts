import type { StatusBadgeTone } from '@/components/pro/StatusBadge';
import type { DeptDto, UserDto, UsersQueryParams } from './api';

export const statusOptions = [
  { value: 'all' },
  { value: 'active' },
  { value: 'disabled' },
  { value: 'unactivated' },
] satisfies { value: UsersQueryParams['status'] }[];

export const avatarClasses = [
  'bg-(--accent-emphasis)',
  'bg-warning',
  'bg-success',
  'bg-danger',
  'bg-(--accent-emphasis) text-white',
  'bg-warning text-white',
];

const defaultDeptIndentClass = 'pl-0';
const maxDeptIndentDepth = 8;
const deptIndentClasses: Record<number, string> = {
  0: defaultDeptIndentClass,
  1: 'pl-[calc(18px*var(--app-scale))]',
  2: 'pl-[calc(36px*var(--app-scale))]',
  3: 'pl-[calc(54px*var(--app-scale))]',
  4: 'pl-[calc(72px*var(--app-scale))]',
  5: 'pl-[calc(90px*var(--app-scale))]',
  6: 'pl-[calc(108px*var(--app-scale))]',
  7: 'pl-[calc(126px*var(--app-scale))]',
  8: 'pl-[calc(144px*var(--app-scale))]',
};

export function deptIndentClass(depth: number) {
  const normalizedDepth = Math.max(0, Math.min(Math.trunc(depth), maxDeptIndentDepth));
  return deptIndentClasses[normalizedDepth] ?? defaultDeptIndentClass;
}

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
