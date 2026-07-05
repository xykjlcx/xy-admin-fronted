import type { JSX } from 'react';
import { matchPermission } from '@/lib/permission';
import { UsersToolbar } from './UsersToolbar';
import { DeptTree } from './DeptTree';
import { MembersTable } from './MembersTable';
import type { MembersVariant, UsersSearch } from '../types';
import type { UsersQueryParams } from '../api';

interface MembersSceneProps {
  variant: MembersVariant;
  permissions: string[];
  search: UsersSearch;
  onSearchChange: (patch: Partial<UsersQueryParams>) => void;
}

export function MembersScene({
  variant,
  permissions,
  search,
  onSearchChange,
}: MembersSceneProps): JSX.Element {
  const canCreate = matchPermission(permissions, 'iam:user:create');

  return (
    <div className="flex min-h-0 flex-1">
      <DeptTree
        selectedId={search.deptId}
        onSelect={(deptId) => onSearchChange({ deptId, page: 1 })}
      />

      <main className="flex min-w-0 flex-1 flex-col px-6 py-[calc(18px*var(--app-scale))]">
        <UsersToolbar
          variant={variant}
          search={search}
          canCreate={canCreate}
          onSearchChange={onSearchChange}
        />
        <MembersTable
          variant={variant}
          permissions={permissions}
          search={search}
          onSearchChange={onSearchChange}
        />
      </main>
    </div>
  );
}
