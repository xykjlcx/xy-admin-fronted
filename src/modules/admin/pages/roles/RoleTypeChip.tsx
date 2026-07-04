import { cn } from '@/lib/utils';
import type { RoleType } from '@/modules/admin/api/role.api';
import { roleTypeClass } from './model';

export function RoleTypeChip({ type, label }: { type: RoleType; label: string }) {
  return (
    <span className={cn('inline-flex rounded-5 px-2 py-0.5 text-xs', roleTypeClass(type))}>
      {label}
    </span>
  );
}
