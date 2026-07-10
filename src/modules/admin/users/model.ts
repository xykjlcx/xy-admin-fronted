import type { StatusBadgeTone } from '@/components/pro/StatusBadge';
import { z } from 'zod';
import type { DeptDto, UserDto, UsersQueryParams } from './api';

export const UserFilterFieldSchema = z.enum(['name', 'phone', 'email', 'role', 'status']);
export const UserFilterOperatorSchema = z.enum(['contains', 'eq']);
export const UserFilterConditionSchema = z.object({
  id: z.string(),
  field: UserFilterFieldSchema,
  operator: UserFilterOperatorSchema,
  value: z.string(),
});
export const UserFilterConditionsSchema = z.array(UserFilterConditionSchema);

export type UserFilterCondition = z.infer<typeof UserFilterConditionSchema>;
export interface UserFilterDraftCondition {
  id: string;
  field: string;
  operator: string;
  value: string;
}

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
  const getDepth = (dept: DeptDto, path: Set<string>): number => {
    if (!dept.parentId) return 0;
    // 环防御：父链回指到已在路径中的节点，按 0 处理并停止递归，不抛错
    if (path.has(dept.id)) return 0;
    path.add(dept.id);
    const parent = byId.get(dept.parentId);
    return parent ? getDepth(parent, path) + 1 : 0;
  };
  return new Map(depts.map((dept) => [dept.id, getDepth(dept, new Set())]));
}

/** 返回 rootId 自身及其全部子孙的 id 集合（按 parentId 关系向下遍历，天然防环） */
export function collectDeptSubtreeIds(depts: DeptDto[], rootId: string): Set<string> {
  const childrenByParent = new Map<string, DeptDto[]>();
  for (const dept of depts) {
    if (!dept.parentId) continue;
    const siblings = childrenByParent.get(dept.parentId);
    if (siblings) siblings.push(dept);
    else childrenByParent.set(dept.parentId, [dept]);
  }

  const ids = new Set<string>();
  const stack: string[] = [rootId];
  while (stack.length > 0) {
    const id = stack.pop();
    if (id === undefined || ids.has(id)) continue;
    ids.add(id);
    for (const child of childrenByParent.get(id) ?? []) stack.push(child.id);
  }
  return ids;
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

export function parseUserFilters(raw: string | undefined): UserFilterCondition[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    const result = UserFilterConditionsSchema.safeParse(parsed);
    return result.success ? result.data : [];
  } catch {
    return [];
  }
}

export function stringifyUserFilters(filters: UserFilterCondition[]) {
  return filters.length > 0 ? JSON.stringify(filters) : '';
}

export function sanitizeUserFilters(filters: UserFilterDraftCondition[]): UserFilterCondition[] {
  return filters.flatMap((item) => {
    const result = UserFilterConditionSchema.safeParse(item);
    return result.success ? [result.data] : [];
  });
}

function userFieldValue(user: UserDto, field: UserFilterCondition['field']) {
  return user[field];
}

function matchCondition(user: UserDto, condition: UserFilterCondition) {
  const expected = condition.value.trim();
  if (!expected) return true;
  const actual = userFieldValue(user, condition.field);
  if (condition.operator === 'eq') return actual.toLowerCase() === expected.toLowerCase();
  return actual.toLowerCase().includes(expected.toLowerCase());
}

export function userMatchesAdvancedFilters(user: UserDto, filters: UserFilterCondition[]) {
  return filters.every((condition) => matchCondition(user, condition));
}
