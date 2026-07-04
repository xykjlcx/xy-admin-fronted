import { useMemo, useState } from 'react';
import { Check, ChevronRight, ChevronsDown, ChevronsUp, KeyRound, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type {
  PermissionResourceDto,
  PermissionTreeGroupDto,
  RolePermissionMap,
} from '@/modules/admin/api/role.api';
import { PermissionGroupIcon, TriStateButton } from './PermissionControls';
import { actionList, cleanPermissions, clonePermissions } from './model';
import type { PermissionDraftState, PermissionDraftUpdater, TriState } from './types';

export function RolePermissionEditor({
  roleId,
  permissionTree,
  rolePermissions,
  canGrant,
  onSave,
}: {
  roleId: string;
  permissionTree: PermissionTreeGroupDto[];
  rolePermissions: RolePermissionMap;
  canGrant: boolean;
  onSave: (id: string, permissions: RolePermissionMap) => void | Promise<void>;
}) {
  const { t } = useTranslation('admin');
  const [permissionKeyword, setPermissionKeyword] = useState('');
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<string[]>([]);
  const [permissionDraftState, setPermissionDraftState] = useState<PermissionDraftState>(() => ({
    roleId,
    source: rolePermissions,
    draft: clonePermissions(rolePermissions),
  }));

  const draftPermissions =
    permissionDraftState.roleId === roleId && permissionDraftState.source === rolePermissions
      ? permissionDraftState.draft
      : clonePermissions(rolePermissions);
  const permissionActionSets = useMemo(
    () => new Map(Object.entries(draftPermissions).map(([resourceId, actions]) => [resourceId, new Set(actions)])),
    [draftPermissions],
  );
  const permissionStats = useMemo(() => {
    let total = 0;
    let granted = 0;
    for (const group of permissionTree) {
      for (const resource of group.resources) {
        for (const action of resource.actions) {
          total += 1;
          if (draftPermissions[resource.id]?.includes(action.id)) granted += 1;
        }
      }
    }
    return { total, granted, pct: total ? Math.round((granted / total) * 100) : 0 };
  }, [draftPermissions, permissionTree]);
  const filteredPermissionTree = useMemo(() => {
    const keyword = permissionKeyword.trim().toLowerCase();
    if (!keyword) return permissionTree;
    return permissionTree
      .map((group) => ({
        ...group,
        resources: group.resources.filter(
          (resource) =>
            group.label.toLowerCase().includes(keyword) ||
            resource.label.toLowerCase().includes(keyword) ||
            resource.code.toLowerCase().includes(keyword) ||
            resource.actions.some((action) => action.label.toLowerCase().includes(keyword)),
        ),
      }))
      .filter((group) => group.resources.length > 0);
  }, [permissionKeyword, permissionTree]);

  const updateDraftPermissions = (updater: PermissionDraftUpdater) => {
    setPermissionDraftState((current) => {
      const base =
        current.roleId === roleId && current.source === rolePermissions
          ? current.draft
          : clonePermissions(rolePermissions);
      const draft = typeof updater === 'function' ? updater(base) : updater;
      return { roleId, source: rolePermissions, draft };
    });
  };
  const hasAction = (resourceId: string, actionId: string) =>
    permissionActionSets.get(resourceId)?.has(actionId) ?? false;
  const setResourceActions = (resourceId: string, actions: string[]) => {
    updateDraftPermissions((current) => cleanPermissions({ ...current, [resourceId]: actions }));
  };
  const toggleAction = (resource: PermissionResourceDto, actionId: string) => {
    updateDraftPermissions((current) => {
      const currentActions = current[resource.id] ?? [];
      const nextActions = currentActions.includes(actionId)
        ? currentActions.filter((item) => item !== actionId)
        : [...currentActions, actionId];
      return cleanPermissions({ ...current, [resource.id]: nextActions });
    });
  };
  const resourceState = (resource: PermissionResourceDto): TriState => {
    const total = resource.actions.length;
    const granted = resource.actions.filter((action) => hasAction(resource.id, action.id)).length;
    if (granted === 0) return 'none';
    return granted === total ? 'all' : 'some';
  };
  const groupState = (group: PermissionTreeGroupDto): TriState => {
    const actions = group.resources.flatMap((resource) =>
      resource.actions.map((action) => ({ resourceId: resource.id, actionId: action.id })),
    );
    const granted = actions.filter((action) => hasAction(action.resourceId, action.actionId)).length;
    if (granted === 0) return 'none';
    return granted === actions.length ? 'all' : 'some';
  };
  const toggleResource = (resource: PermissionResourceDto) => {
    setResourceActions(resource.id, resourceState(resource) === 'all' ? [] : actionList(resource));
  };
  const toggleGroup = (group: PermissionTreeGroupDto) => {
    const shouldGrant = groupState(group) !== 'all';
    updateDraftPermissions((current) => {
      const next = { ...current };
      for (const resource of group.resources) {
        next[resource.id] = shouldGrant ? actionList(resource) : [];
      }
      return cleanPermissions(next);
    });
  };
  const setAllPermissions = (checked: boolean) => {
    if (!checked) {
      updateDraftPermissions({});
      return;
    }
    updateDraftPermissions(
      Object.fromEntries(
        permissionTree.flatMap((group) => group.resources.map((resource) => [resource.id, actionList(resource)])),
      ) as RolePermissionMap,
    );
  };
  const toggleGroupCollapsed = (groupId: string) => {
    setCollapsedGroupIds((current) =>
      current.includes(groupId) ? current.filter((id) => id !== groupId) : [...current, groupId],
    );
  };

  return (
    <div className="min-h-0">
      <div className="mb-4 flex flex-wrap items-center gap-3.5">
        <div className="flex shrink-0 items-center gap-2">
          <KeyRound className="size-4 text-pri" />
          <span className="text-sm font-semibold text-text">
            {t('roles.permission.granted', {
              granted: permissionStats.granted,
              total: permissionStats.total,
            })}
          </span>
        </div>
        <div className="h-1.5 min-w-[calc(100px*var(--app-scale))] max-w-[calc(180px*var(--app-scale))] flex-1 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-pri transition-[width]"
            style={{ width: `${permissionStats.pct}%` }}
          />
        </div>
        <div className="flex h-[calc(34px*var(--app-scale))] w-[calc(200px*var(--app-scale))] items-center gap-2 rounded-8 bg-surface-2 px-3">
          <Search className="size-3.5 text-text-3" />
          <input
            value={permissionKeyword}
            placeholder={t('roles.permissionSearchPlaceholder')}
            className="min-w-0 flex-1 bg-transparent text-[calc(13px*var(--app-scale))] outline-none placeholder:text-text-3"
            onChange={(event) => setPermissionKeyword(event.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            className="inline-flex h-[calc(34px*var(--app-scale))] items-center gap-1 rounded-8 px-3 text-[calc(13px*var(--app-scale))] text-text-2 hover:bg-surface-2"
            onClick={() => setCollapsedGroupIds([])}
          >
            <ChevronsDown className="size-3.5" />
            {t('roles.actions.expand')}
          </button>
          <button
            type="button"
            className="inline-flex h-[calc(34px*var(--app-scale))] items-center gap-1 rounded-8 px-3 text-[calc(13px*var(--app-scale))] text-text-2 hover:bg-surface-2"
            onClick={() => setCollapsedGroupIds(permissionTree.map((group) => group.id))}
          >
            <ChevronsUp className="size-3.5" />
            {t('roles.actions.collapse')}
          </button>
          {canGrant && (
            <>
              <button
                type="button"
                className="h-[calc(34px*var(--app-scale))] rounded-8 px-3 text-[calc(13px*var(--app-scale))] text-danger hover:bg-danger-soft"
                onClick={() => setAllPermissions(false)}
              >
                {t('roles.actions.clear')}
              </button>
              <button
                type="button"
                className="inline-flex h-[calc(34px*var(--app-scale))] items-center gap-1.5 rounded-8 border border-pri px-3.5 text-[calc(13px*var(--app-scale))] text-pri hover:bg-pri-soft"
                onClick={() => setAllPermissions(true)}
              >
                <Check className="size-3.5 stroke-[2.5px]" />
                {t('roles.actions.grantAll')}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {filteredPermissionTree.length > 0 ? (
          filteredPermissionTree.map((group) => {
            const collapsed = collapsedGroupIds.includes(group.id);
            const groupGranted = group.resources.reduce(
              (count, resource) =>
                count + resource.actions.filter((action) => hasAction(resource.id, action.id)).length,
              0,
            );
            const groupTotal = group.resources.reduce((count, resource) => count + resource.actions.length, 0);

            return (
              <div key={group.id} className="overflow-hidden rounded-12 border border-border">
                <div className="flex h-[calc(52px*var(--app-scale))] items-center gap-3 bg-surface-2 px-4">
                  <button
                    type="button"
                    aria-label={t(collapsed ? 'roles.permission.expandGroup' : 'roles.permission.collapseGroup', {
                      group: group.label,
                    })}
                    aria-expanded={!collapsed}
                    className="flex size-5 items-center justify-center text-text-3"
                    onClick={() => toggleGroupCollapsed(group.id)}
                  >
                    <ChevronRight className={cn('size-4 transition-transform', collapsed && '-rotate-90')} />
                  </button>
                  <PermissionGroupIcon id={group.id} />
                  <span className="flex-1 text-sm font-semibold text-text">{group.label}</span>
                  <span className="text-xs text-text-3">
                    {t('roles.permission.groupCount', { granted: groupGranted, total: groupTotal })}
                  </span>
                  <TriStateButton
                    state={groupState(group)}
                    ariaLabel={t('roles.permission.toggleGroup', { group: group.label })}
                    disabled={!canGrant}
                    onClick={() => toggleGroup(group)}
                  />
                </div>
                {!collapsed && (
                  <div>
                    {group.resources.map((resource) => (
                      <div
                        key={resource.id}
                        className="flex items-start gap-3.5 border-t border-border px-[calc(18px*var(--app-scale))] py-3.5"
                      >
                        <TriStateButton
                          state={resourceState(resource)}
                          ariaLabel={t('roles.permission.toggleResource', { resource: resource.label })}
                          disabled={!canGrant}
                          className="mt-0.5"
                          onClick={() => toggleResource(resource)}
                        />
                        <div className="w-[calc(150px*var(--app-scale))] shrink-0">
                          <div className="text-sm font-medium text-text">{resource.label}</div>
                          <div className="mt-0.5 text-xs tabular-nums text-text-3">{resource.code}</div>
                        </div>
                        <div className="flex flex-1 flex-wrap gap-2">
                          {resource.actions.map((action) => {
                            const on = hasAction(resource.id, action.id);
                            return (
                              <button
                                key={action.id}
                                type="button"
                                aria-label={t('roles.permission.toggleAction', {
                                  resource: resource.label,
                                  action: action.label,
                                })}
                                disabled={!canGrant}
                                className={cn(
                                  'inline-flex h-[calc(30px*var(--app-scale))] items-center gap-1.5 rounded-7 border px-3 text-[calc(13px*var(--app-scale))] transition-colors disabled:cursor-not-allowed disabled:opacity-70',
                                  on
                                    ? 'border-pri bg-pri-soft text-pri'
                                    : 'border-border bg-surface text-text-2 hover:border-pri',
                                )}
                                onClick={() => toggleAction(resource, action.id)}
                              >
                                {on && <Check className="size-3 stroke-[3px]" />}
                                {action.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="rounded-12 border border-border py-12 text-center text-sm text-text-3">
            {t('roles.noPermissionResult')}
          </div>
        )}
      </div>

      {canGrant && (
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="outline" onClick={() => updateDraftPermissions(clonePermissions(rolePermissions))}>
            {t('roles.actions.reset')}
          </Button>
          <Button onClick={() => onSave(roleId, cleanPermissions(draftPermissions))}>
            {t('roles.actions.savePermissions')}
          </Button>
        </div>
      )}
    </div>
  );
}
