import { useCallback, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useTranslation } from 'react-i18next';
import { DataTable } from '@/components/pro/DataTable';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SelectControl } from '@/components/ui/select';
import {
  normalizeRoleDataPermission,
  type DataScope,
  type ResourceDataPermission,
  type ResourceDataScope,
  type RoleDataPermission,
} from '@/modules/admin/roles/api';
import type { DeptDto } from '@/modules/admin/users/api';

interface DataResourceRow {
  id: string;
  label: string;
  permission: ResourceDataPermission;
  onScopeChange: (scope: ResourceDataScope) => void;
  onDepartmentsChange: (departmentIds: string[]) => void;
}

interface DataPermissionDraftState {
  roleId: string;
  source: RoleDataPermission;
  draft: RoleDataPermission;
}

const resourceIds = ['members', 'files', 'notices', 'auditLogs'] as const;

function cloneDataPermission(permission: RoleDataPermission): RoleDataPermission {
  return structuredClone(permission);
}

function DepartmentPicker({
  label,
  departments,
  selectedIds,
  onChange,
}: {
  label: string;
  departments: Pick<DeptDto, 'id' | 'name'>[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const { t } = useTranslation('admin');
  const selected = new Set(selectedIds);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" aria-label={label}>
          {selectedIds.length > 0
            ? t('roles.dataPermission.departmentsSelected', { count: selectedIds.length })
            : t('roles.dataPermission.selectDepartments')}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start">
        <FieldSet>
          <FieldLegend>{t('roles.dataPermission.visibleDepartments')}</FieldLegend>
          {departments.map((department) => (
            <Field key={department.id} className="flex grid-cols-[auto_1fr] items-center gap-2">
              <Checkbox
                id={`role-data-dept-${department.id}`}
                checked={selected.has(department.id)}
                aria-label={department.name}
                onCheckedChange={(checked) => {
                  onChange(
                    checked
                      ? [...selectedIds, department.id]
                      : selectedIds.filter((id) => id !== department.id),
                  );
                }}
              />
              <FieldLabel htmlFor={`role-data-dept-${department.id}`}>{department.name}</FieldLabel>
            </Field>
          ))}
        </FieldSet>
      </PopoverContent>
    </Popover>
  );
}

export function RoleDataPermissionEditor({
  roleId,
  permission,
  departments,
  canGrant,
  onSave,
}: {
  roleId: string;
  permission: RoleDataPermission;
  departments: Pick<DeptDto, 'id' | 'name'>[];
  canGrant: boolean;
  onSave: (id: string, permission: RoleDataPermission) => void | Promise<void>;
}) {
  const { t } = useTranslation('admin');
  const [draftState, setDraftState] = useState<DataPermissionDraftState>(() => ({
    roleId,
    source: permission,
    draft: cloneDataPermission(permission),
  }));
  const draft =
    draftState.roleId === roleId && draftState.source === permission
      ? draftState.draft
      : cloneDataPermission(permission);

  const updateDraft = useCallback(
    (updater: (current: RoleDataPermission) => RoleDataPermission) => {
      setDraftState((current) => {
        const base =
          current.roleId === roleId && current.source === permission
            ? current.draft
            : cloneDataPermission(permission);
        return { roleId, source: permission, draft: updater(base) };
      });
    },
    [permission, roleId],
  );

  const defaultScopeOptions = useMemo(
    () =>
      (['all', 'deptAndChildren', 'dept', 'self', 'custom'] as const).map((scope) => ({
        value: scope,
        label: t(`roles.dataPermission.scopes.${scope}`),
      })),
    [t],
  );
  const resourceScopeOptions = useMemo(
    () =>
      (['inherit', 'all', 'deptAndChildren', 'dept', 'self', 'custom'] as const).map((scope) => ({
        value: scope,
        label: t(`roles.dataPermission.scopes.${scope}`),
      })),
    [t],
  );
  const resources = useMemo<DataResourceRow[]>(
    () =>
      resourceIds.map((id) => {
        const resource = draft.resources[id] ?? { scope: 'inherit' as const, departmentIds: [] };
        return {
          id,
          label: t(`roles.dataPermission.resources.${id}`),
          permission: resource,
          onScopeChange: (scope) => {
            updateDraft((current) => ({
              ...current,
              resources: {
                ...current.resources,
                [id]: {
                  scope,
                  departmentIds: scope === 'custom' ? resource.departmentIds : [],
                },
              },
            }));
          },
          onDepartmentsChange: (departmentIds) => {
            updateDraft((current) => ({
              ...current,
              resources: {
                ...current.resources,
                [id]: { scope: 'custom', departmentIds },
              },
            }));
          },
        };
      }),
    [draft.resources, t, updateDraft],
  );

  const columns = useMemo<ColumnDef<DataResourceRow>[]>(
    () => [
      {
        id: 'resource',
        header: t('roles.dataPermission.columns.resource'),
        cell: ({ row }) => <span className="font-medium">{row.original.label}</span>,
        size: 170,
        minSize: 150,
      },
      {
        id: 'scope',
        header: t('roles.dataPermission.columns.scope'),
        cell: ({ row }) => {
          return (
            <SelectControl
              size="sm"
              value={row.original.permission.scope}
              options={resourceScopeOptions}
              aria-label={t('roles.dataPermission.resourceScopeLabel', { resource: row.original.label })}
              onValueChange={(value) => row.original.onScopeChange(value as ResourceDataScope)}
            />
          );
        },
        size: 260,
        minSize: 220,
      },
      {
        id: 'departments',
        header: t('roles.dataPermission.columns.departments'),
        size: 220,
        minSize: 180,
        cell: ({ row }) => {
          if (row.original.permission.scope !== 'custom') {
            return <span className="text-text-3">{t('roles.dataPermission.notApplicable')}</span>;
          }
          return (
            <DepartmentPicker
              label={t('roles.dataPermission.selectResourceDepartments', { resource: row.original.label })}
              departments={departments}
              selectedIds={row.original.permission.departmentIds}
              onChange={row.original.onDepartmentsChange}
            />
          );
        },
      },
    ],
    [departments, resourceScopeOptions, t],
  );

  return (
    <div data-role-data-permission-editor className="flex flex-col">
      <FieldGroup className="mb-4 grid grid-cols-[minmax(220px,360px)_1fr] items-end gap-3">
        <Field>
          <FieldLabel htmlFor="role-default-data-scope">{t('roles.dataPermission.defaultScope')}</FieldLabel>
          <SelectControl
            id="role-default-data-scope"
            value={draft.defaultScope}
            options={defaultScopeOptions}
            aria-label={t('roles.dataPermission.defaultScope')}
            onValueChange={(value) => {
              updateDraft((current) => ({
                ...current,
                defaultScope: value as DataScope,
                defaultDepartmentIds: value === 'custom' ? current.defaultDepartmentIds : [],
              }));
            }}
          />
          <FieldDescription>{t('roles.dataPermission.defaultScopeDesc')}</FieldDescription>
        </Field>
        {draft.defaultScope === 'custom' ? (
          <Field>
            <FieldLabel>{t('roles.dataPermission.customDepartments')}</FieldLabel>
            <DepartmentPicker
              label={t('roles.dataPermission.selectDefaultDepartments')}
              departments={departments}
              selectedIds={draft.defaultDepartmentIds}
              onChange={(defaultDepartmentIds) => {
                updateDraft((current) => ({ ...current, defaultDepartmentIds }));
              }}
            />
          </Field>
        ) : null}
      </FieldGroup>

      <div data-role-data-permission-content className="pb-2 pr-1">
        <DataTable
          columns={columns}
          data={resources}
          rowKey={(resource) => resource.id}
          emptyText={t('roles.dataPermission.empty')}
          loadingText={t('roles.refreshing')}
        />
      </div>

      {canGrant ? (
        <div className="mt-3 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setDraftState({ roleId, source: permission, draft: cloneDataPermission(permission) })
            }
          >
            {t('roles.actions.reset')}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => onSave(roleId, normalizeRoleDataPermission(draft))}
          >
            {t('roles.actions.saveDataPermissions')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
