import { useMemo, useState, type JSX } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Folder, Pencil, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DataTable } from '@/components/pro/DataTable';
import { Button } from '@/components/ui/button';
import { matchPermission } from '@/lib/permission';
import {
  deptsQuery,
  useDeptMutations,
  type CreateDeptInput,
  type DeptDto,
  type UpdateDeptInput,
} from '../api';
import { DeptFormDialog } from '../form/DeptFormDialog';
import { buildDepthMap, deptIndentClass } from '../model';
import type { DeptFormState } from '../types';

interface DeptSceneProps {
  permissions: string[];
  systemAdmin?: boolean;
}

export function DeptScene({ permissions, systemAdmin = false }: DeptSceneProps): JSX.Element {
  const { t } = useTranslation('admin');
  const { data: depts = [], isPending } = useQuery(deptsQuery);
  const mutations = useDeptMutations();
  const depthMap = useMemo(() => buildDepthMap(depts), [depts]);
  const [formState, setFormState] = useState<DeptFormState>({ kind: 'closed' });
  const canCreate = matchPermission({ permissions, systemAdmin }, 'iam:dept:create');
  const canUpdate = matchPermission({ permissions, systemAdmin }, 'iam:dept:update');
  const columns: ColumnDef<DeptDto>[] = [
    {
      id: 'dept',
      header: t('users.columns.dept'),
      size: 360,
      minSize: 260,
      enableSorting: false,
      cell: ({ row }) => {
        const dept = row.original;

        return (
          <div className={`flex min-w-0 items-center gap-2 ${deptIndentClass(depthMap.get(dept.id) ?? 0)}`}>
            <Folder className="size-4 shrink-0 text-text-3" />
            <span className="truncate text-sm text-text">{dept.name}</span>
          </div>
        );
      },
    },
    {
      id: 'memberCount',
      header: t('users.columns.memberCount'),
      size: 140,
      minSize: 120,
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-[calc(13px*var(--app-scale))] text-text-2">
          {t('users.memberCount', { count: row.original.memberCount })}
        </span>
      ),
    },
    {
      id: 'actions',
      header: t('users.columns.actions'),
      size: 220,
      minSize: 220,
      maxSize: 220,
      enablePinning: true,
      meta: { headerAlign: 'start', cellAlign: 'end', pin: 'right', stopRowClick: true },
      enableSorting: false,
      cell: ({ row }) => {
        const dept = row.original;

        return (
          <div className="flex items-center justify-end gap-2">
            {canCreate && (
              <Button
                type="button"
                variant="text"
                size="xs"
                onClick={() => setFormState({ kind: 'createChild', parent: dept })}
              >
                <Plus data-icon="inline-start" />
                {t('users.actions.createChildDept')}
              </Button>
            )}
            {canUpdate && (
              <Button
                type="button"
                variant="text"
                size="xs"
                onClick={() => setFormState({ kind: 'edit', dept })}
              >
                <Pencil data-icon="inline-start" />
                {t('users.actions.editDept')}
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const handleCreateDept = async (dto: CreateDeptInput) => {
    await mutations.createDept.mutateAsync(dto);
  };

  const handleUpdateDept = async (id: string, dto: UpdateDeptInput) => {
    await mutations.updateDept.mutateAsync({ id, dto });
  };

  return (
    <>
      <main className="flex min-w-0 flex-1 flex-col px-(--page-scene-px) py-(--page-scene-py)">
        <div className="mb-3 flex items-center gap-3">
          <div className="min-w-0">
            <div className="text-base font-bold">{t('users.deptList.title')}</div>
            <div className="mt-1 text-[calc(13px*var(--app-scale))] text-text-3">
              {t('users.deptList.subtitle')}
            </div>
          </div>
          <div className="flex-1" />
          {canCreate && (
            <Button type="button" size="sm" onClick={() => setFormState({ kind: 'create' })}>
              <Plus data-icon="inline-start" />
              {t('users.actions.createDept')}
            </Button>
          )}
        </div>
        <DataTable
          columns={columns}
          data={depts}
          rowKey={(dept) => dept.id}
          loading={isPending}
          emptyText={t('users.deptList.empty')}
          loadingText={t('users.deptList.loading')}
        />
      </main>
      <DeptFormDialog
        state={formState}
        depts={depts}
        onOpenChange={(open) => !open && setFormState({ kind: 'closed' })}
        onCreateDept={handleCreateDept}
        onUpdateDept={handleUpdateDept}
      />
    </>
  );
}
