import { Badge } from '@/components/ui/badge';
import type { RoleType } from '@/modules/admin/api/role.api';

export function RoleTypeChip({ type, label }: { type: RoleType; label: string }) {
  return <Badge variant={type === 'system' ? 'primary' : 'success'}>{label}</Badge>;
}
