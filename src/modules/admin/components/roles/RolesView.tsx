import { useMemo, useState } from 'react';
import {
  Bell,
  Check,
  ChevronRight,
  ChevronsDown,
  ChevronsUp,
  Folder,
  History,
  KeyRound,
  List,
  Network,
  Plus,
  Search,
  Shield,
  SlidersHorizontal,
  Trash2,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@/components/pro/ConfirmDialog';
import { TableShell, TableShellHeader, TableShellRow } from '@/components/pro/TableShell';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { matchPermission } from '@/lib/permission';
import { cn } from '@/lib/utils';
import type {
  AdminRoleDto,
  CreateAdminRoleInput,
  CreateRoleInput,
  PermissionResourceDto,
  PermissionTreeGroupDto,
  RoleDto,
  RoleLogDto,
  RoleLogKind,
  RolePermissionMap,
} from '@/modules/admin/api/role.api';

export interface SelectableMemberDto {
  id: string;
  name: string;
}

export interface RolesViewProps {
  permissions: string[];
  roles: RoleDto[];
  activeRoleId: string;
  permissionTree: PermissionTreeGroupDto[];
  rolePermissions: RolePermissionMap;
  roleMembers: { id: string; name: string; deptLabel: string; title: string }[];
  roleLogs: RoleLogDto[];
  adminRoles: AdminRoleDto[];
  selectableMembers: SelectableMemberDto[];
  roleDetailRefreshing?: boolean;
  onActiveRoleChange: (id: string) => void;
  onCreateRole: (dto: CreateRoleInput) => void | Promise<void>;
  onDeleteRole: (id: string) => void | Promise<void>;
  onSaveRolePermissions: (id: string, permissions: RolePermissionMap) => void | Promise<void>;
  onCreateAdminRole: (dto: CreateAdminRoleInput) => void | Promise<void>;
}

type PageTab = 'roles' | 'admins';
type DetailTab = 'permissions' | 'members' | 'logs';
type TriState = 'none' | 'some' | 'all';
type PermissionDraftUpdater = RolePermissionMap | ((current: RolePermissionMap) => RolePermissionMap);

interface PermissionDraftState {
  roleId: string;
  source: RolePermissionMap;
  draft: RolePermissionMap;
}

const adminGridTemplate = '1.2fr 1fr 1.8fr calc(140px * var(--app-scale))';
const avatarClasses = [
  'bg-pri',
  'bg-success',
  'bg-warning',
  'bg-danger',
  'bg-text-3',
  'bg-pri text-white',
];

const logToneClass: Record<RoleLogKind, string> = {
  grant: 'bg-success-soft text-success',
  add: 'bg-pri-soft text-pri',
  remove: 'bg-danger-soft text-danger',
  edit: 'bg-warning-soft text-warning',
  create: 'bg-pri-soft text-pri',
};

const emptyRoleDraft: CreateRoleInput = { name: '', desc: '' };
const emptyAdminDraft: CreateAdminRoleInput = { name: '', admin: '' };

function clonePermissions(permissions: RolePermissionMap): RolePermissionMap {
  return Object.fromEntries(Object.entries(permissions).map(([resourceId, actions]) => [resourceId, [...actions]]));
}

function cleanPermissions(permissions: RolePermissionMap): RolePermissionMap {
  return Object.fromEntries(
    Object.entries(permissions)
      .map<[string, string[]]>(([resourceId, actions]) => [resourceId, [...new Set(actions)]])
      .filter(([, actions]) => actions.length > 0),
  );
}

function initials(name: string) {
  return name.slice(-2);
}

function roleTypeClass(type: RoleDto['type']) {
  return type === 'system' ? 'bg-pri-soft text-pri' : 'bg-success-soft text-success';
}

function adminRoleTypeClass(type: AdminRoleDto['type']) {
  return type === 'system' ? 'bg-pri-soft text-pri' : 'bg-success-soft text-success';
}

function TypeChip({ type, label }: { type: RoleDto['type']; label: string }) {
  return (
    <span className={cn('inline-flex rounded-5 px-2 py-0.5 text-xs', roleTypeClass(type))}>
      {label}
    </span>
  );
}

function AdminTypeChip({ type, label }: { type: AdminRoleDto['type']; label: string }) {
  return (
    <span className={cn('inline-flex rounded-5 px-2 py-0.5 text-xs', adminRoleTypeClass(type))}>
      {label}
    </span>
  );
}

function TriStateButton({
  state,
  ariaLabel,
  onClick,
  className,
  disabled,
}: {
  state: TriState;
  ariaLabel: string;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      className={cn(
        'flex size-[calc(18px*var(--app-scale))] shrink-0 items-center justify-center rounded-5 border transition-colors disabled:cursor-not-allowed disabled:opacity-60',
        state === 'none' ? 'border-border bg-surface text-transparent hover:border-pri' : 'border-pri bg-pri text-white',
        className,
      )}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      {state === 'all' && <Check className="size-[calc(12px*var(--app-scale))] stroke-[3px]" />}
      {state === 'some' && <Check className="size-[calc(12px*var(--app-scale))] stroke-[3px]" />}
    </button>
  );
}

function actionList(resource: PermissionResourceDto) {
  return resource.actions.map((action) => action.id);
}

function PermissionGroupIcon({ id }: { id: string }) {
  const className = 'size-4.5 text-text-2';
  if (id === 'iam') return <Network className={className} />;
  if (id === 'audit') return <List className={className} />;
  if (id === 'file') return <Folder className={className} />;
  if (id === 'notice') return <Bell className={className} />;
  if (id === 'sys') return <SlidersHorizontal className={className} />;
  return <Shield className={className} />;
}

export function RolesView({
  permissions,
  roles,
  activeRoleId,
  permissionTree,
  rolePermissions,
  roleMembers,
  roleLogs,
  adminRoles,
  selectableMembers,
  roleDetailRefreshing = false,
  onActiveRoleChange,
  onCreateRole,
  onDeleteRole,
  onSaveRolePermissions,
  onCreateAdminRole,
}: RolesViewProps) {
  const { t } = useTranslation('admin');
  const activeRole = roles.find((role) => role.id === activeRoleId) ?? roles[0];
  const currentRoleId = activeRole?.id ?? activeRoleId;
  const [pageTab, setPageTab] = useState<PageTab>('roles');
  const [detailTab, setDetailTab] = useState<DetailTab>('permissions');
  const [roleKeyword, setRoleKeyword] = useState('');
  const [permissionKeyword, setPermissionKeyword] = useState('');
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<string[]>([]);
  const [permissionDraftState, setPermissionDraftState] = useState<PermissionDraftState>(() => ({
    roleId: currentRoleId,
    source: rolePermissions,
    draft: clonePermissions(rolePermissions),
  }));
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RoleDto | null>(null);
  const [roleDraft, setRoleDraft] = useState<CreateRoleInput>({ ...emptyRoleDraft });
  const [adminDraft, setAdminDraft] = useState<CreateAdminRoleInput>({ ...emptyAdminDraft });

  const draftPermissions =
    permissionDraftState.roleId === currentRoleId && permissionDraftState.source === rolePermissions
      ? permissionDraftState.draft
      : clonePermissions(rolePermissions);
  const updateDraftPermissions = (updater: PermissionDraftUpdater) => {
    setPermissionDraftState((current) => {
      const base =
        current.roleId === currentRoleId && current.source === rolePermissions
          ? current.draft
          : clonePermissions(rolePermissions);
      const draft = typeof updater === 'function' ? updater(base) : updater;
      return { roleId: currentRoleId, source: rolePermissions, draft };
    });
  };
  const canCreateRole = matchPermission(permissions, 'iam:role:create');
  const canDeleteRole = matchPermission(permissions, 'iam:role:del');
  const canGrant = matchPermission(permissions, 'iam:role:grant');
  const canCreateAdmin = matchPermission(permissions, 'iam:admin:create');
  const roleTypeLabel = (type: RoleDto['type']) => t(`roles.roleTypes.${type}`);

  const visibleRoles = useMemo(() => {
    const keyword = roleKeyword.trim().toLowerCase();
    if (!keyword) return roles;
    return roles.filter((role) => role.name.toLowerCase().includes(keyword) || role.desc.toLowerCase().includes(keyword));
  }, [roleKeyword, roles]);

  const hasAction = (resourceId: string, actionId: string) =>
    draftPermissions[resourceId]?.includes(actionId) ?? false;

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

  const toggleGroupCollapsed = (groupId: string) => {
    setCollapsedGroupIds((current) =>
      current.includes(groupId) ? current.filter((id) => id !== groupId) : [...current, groupId],
    );
  };

  const submitCreateRole = async () => {
    const dto = { name: roleDraft.name.trim(), desc: roleDraft.desc?.trim() };
    if (!dto.name) return;
    await onCreateRole(dto);
    setRoleDialogOpen(false);
    setRoleDraft({ ...emptyRoleDraft });
  };

  const submitCreateAdminRole = async () => {
    const dto = { name: adminDraft.name.trim(), admin: adminDraft.admin, scope: adminDraft.scope?.trim() || undefined };
    if (!dto.name || !dto.admin) return;
    await onCreateAdminRole(dto);
    setAdminDialogOpen(false);
    setAdminDraft({ ...emptyAdminDraft });
  };

  const confirmDeleteRole = async () => {
    if (!deleteTarget) return;
    await onDeleteRole(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <section
      className="flex min-h-0 flex-col text-text"
      style={{ padding: 'calc(20px * var(--app-scale)) calc(28px * var(--app-scale))' }}
    >
      <div className="mb-4 flex items-center gap-2 text-[calc(13px*var(--app-scale))] text-text-3">
        <span>{t('roles.breadcrumbGroup')}</span>
        <span>›</span>
        <span className="text-text">{t('roles.title')}</span>
      </div>

      <div className="flex min-h-[calc(640px*var(--app-scale))] flex-col overflow-hidden rounded-12 border border-border bg-surface shadow-xs">
        <div className="flex items-end border-b border-border px-6 pt-[calc(18px*var(--app-scale))]">
          {[
            ['roles', t('roles.tabs.roles')],
            ['admins', t('roles.tabs.admins')],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={cn(
                'mr-7 border-b-2 px-1 pb-3 text-[calc(15px*var(--app-scale))]',
                pageTab === key
                  ? 'border-pri font-semibold text-text'
                  : 'border-transparent font-normal text-text-2',
              )}
              onClick={() => setPageTab(key as PageTab)}
            >
              {label}
            </button>
          ))}
        </div>

        {pageTab === 'roles' ? (
          <div className="flex min-h-0 flex-1">
            <aside className="flex w-[calc(280px*var(--app-scale))] shrink-0 flex-col border-r border-border px-3 py-4">
              <div className="mb-3 flex h-[calc(34px*var(--app-scale))] items-center gap-2 rounded-8 bg-surface-2 px-2.5">
                <Search className="size-3.5 text-text-3" />
                <input
                  placeholder={t('roles.searchPlaceholder')}
                  value={roleKeyword}
                  className="min-w-0 flex-1 bg-transparent text-[calc(13px*var(--app-scale))] outline-none placeholder:text-text-3"
                  onChange={(event) => setRoleKeyword(event.target.value)}
                />
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                {visibleRoles.length > 0 ? (
                  visibleRoles.map((role) => (
                    <button
                      key={role.id}
                      type="button"
                      className={cn(
                        'my-0.5 flex h-11 w-full items-center gap-2 rounded-8 px-3 text-left text-sm transition-colors hover:bg-bg',
                        role.id === currentRoleId ? 'bg-pri-soft font-semibold text-pri' : 'text-text',
                      )}
                      onClick={() => onActiveRoleChange(role.id)}
                    >
                      <UserRound className="size-4 shrink-0 opacity-75" />
                      <span className="min-w-0 flex-1 truncate">{role.name}</span>
                      <TypeChip type={role.type} label={roleTypeLabel(role.type)} />
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-8 text-center text-sm text-text-3">{t('roles.empty')}</div>
                )}
              </div>

              {canCreateRole && (
                <button
                  type="button"
                  className="mt-3 flex h-10 items-center justify-center gap-1.5 rounded-8 border border-dashed border-border text-sm text-text-2 transition-colors hover:border-pri hover:text-pri"
                  onClick={() => setRoleDialogOpen(true)}
                >
                  <Plus className="size-4" />
                  {t('roles.actions.addRole')}
                </button>
              )}
            </aside>

            <main className="flex min-w-0 flex-1 flex-col px-7 py-[calc(22px*var(--app-scale))]">
              {activeRole ? (
                <>
                  <div className="mb-1 flex items-center gap-2.5">
                    <h1 className="text-[calc(18px*var(--app-scale))] font-bold text-text">{activeRole.name}</h1>
                    <TypeChip type={activeRole.type} label={roleTypeLabel(activeRole.type)} />
                    <div className="flex-1" />
                    {activeRole.type === 'custom' && canDeleteRole && (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 text-[calc(13px*var(--app-scale))] text-danger"
                        onClick={() => setDeleteTarget(activeRole)}
                      >
                        <Trash2 className="size-3.5" />
                        {t('roles.actions.deleteRole')}
                      </button>
                    )}
                  </div>
                  <p className="mb-4 text-[calc(13px*var(--app-scale))] text-text-3">{activeRole.desc}</p>

                  <div className="mb-[calc(18px*var(--app-scale))] flex items-end border-b border-border">
                    {[
                      ['permissions', t('roles.detailTabs.permissions')],
                      ['members', t('roles.detailTabs.members', { count: roleMembers.length })],
                      ['logs', t('roles.detailTabs.logs')],
                    ].map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        className={cn(
                          'mr-6 border-b-2 px-1 pb-2.5 text-sm',
                          detailTab === key ? 'border-pri font-semibold text-pri' : 'border-transparent text-text-2',
                        )}
                        onClick={() => setDetailTab(key as DetailTab)}
                      >
                        {label}
                      </button>
                    ))}
                    {roleDetailRefreshing && (
                      <span className="mb-2.5 ml-auto text-[calc(12px*var(--app-scale))] text-pri">刷新中</span>
                    )}
                  </div>

                  {detailTab === 'permissions' && (
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
                                <div
                                  className="flex h-[calc(52px*var(--app-scale))] items-center gap-3 bg-surface-2 px-4"
                                >
                                  <button
                                    type="button"
                                    className="flex size-5 items-center justify-center text-text-3"
                                    onClick={() => toggleGroupCollapsed(group.id)}
                                  >
                                    <ChevronRight
                                      className={cn('size-4 transition-transform', collapsed && '-rotate-90')}
                                    />
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
                          <Button onClick={() => onSaveRolePermissions(currentRoleId, cleanPermissions(draftPermissions))}>
                            {t('roles.actions.savePermissions')}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {detailTab === 'members' && (
                    <div className="grid grid-cols-2 gap-3">
                      {roleMembers.map((member, index) => (
                        <div
                          key={member.id}
                          className="flex items-center gap-3 rounded-10 border border-border px-4 py-3.5"
                        >
                          <div
                            className={cn(
                              'flex size-[calc(32px*var(--app-scale))] shrink-0 items-center justify-center rounded-full text-[calc(13px*var(--app-scale))] font-semibold text-white',
                              avatarClasses[index % avatarClasses.length],
                            )}
                          >
                            {initials(member.name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium text-text">{member.name}</div>
                            <div className="mt-0.5 truncate text-xs text-text-3">
                              {member.deptLabel} · {member.title}
                            </div>
                          </div>
                          <button type="button" className="text-[calc(13px*var(--app-scale))] text-danger">
                            {t('roles.actions.removeMember')}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {detailTab === 'logs' && (
                    <div className="overflow-hidden rounded-12 border border-border">
                      {roleLogs.map((log, index) => (
                        <div
                          key={log.id}
                          className="flex items-center gap-3 border-b border-border px-[calc(18px*var(--app-scale))] py-4 last:border-b-0"
                        >
                          <div
                            className={cn(
                              'flex size-[calc(34px*var(--app-scale))] shrink-0 items-center justify-center rounded-full',
                              logToneClass[log.kind],
                            )}
                          >
                            {log.kind === 'create' ? <Shield className="size-4" /> : <History className="size-4" />}
                          </div>
                          <div
                            className={cn(
                              'flex size-[calc(22px*var(--app-scale))] shrink-0 items-center justify-center rounded-full text-[calc(11px*var(--app-scale))] font-semibold text-white',
                              log.who === '系统' ? 'bg-text-3' : avatarClasses[index % avatarClasses.length],
                            )}
                          >
                            {log.who.slice(-1)}
                          </div>
                          <div className="min-w-0 flex-1 text-sm">
                            <span className="font-semibold text-text">{log.who}</span>
                            <span className="ml-1 text-text-2">{log.text}</span>
                          </div>
                          <span className="shrink-0 text-xs text-text-3">{log.time}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center text-sm text-text-3">{t('roles.empty')}</div>
              )}
            </main>
          </div>
        ) : (
          <div className="px-7 py-[calc(22px*var(--app-scale))]">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[calc(13px*var(--app-scale))] text-text-3">{t('roles.adminIntro')}</span>
              {canCreateAdmin && (
                <button
                  type="button"
                  className="inline-flex h-[calc(34px*var(--app-scale))] items-center gap-1.5 rounded-8 bg-pri px-4 text-[calc(13px*var(--app-scale))] text-white hover:bg-pri-hover"
                  onClick={() => setAdminDialogOpen(true)}
                >
                  <Plus className="size-3.5" />
                  {t('roles.actions.createAdmin')}
                </button>
              )}
            </div>

            <TableShell
              header={
                <TableShellHeader gridTemplateColumns={adminGridTemplate} className="px-4">
                  <div>{t('roles.columns.adminRole')}</div>
                  <div>{t('roles.columns.admin')}</div>
                  <div>{t('roles.columns.scope')}</div>
                  <div>{t('roles.columns.actions')}</div>
                </TableShellHeader>
              }
              className="rounded-10"
            >
              {adminRoles.map((role, index) => (
                <TableShellRow
                  key={role.id}
                  gridTemplateColumns={adminGridTemplate}
                  className="h-[calc(60px*var(--app-scale))] px-4"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-medium text-text">{role.name}</span>
                    <AdminTypeChip type={role.type} label={roleTypeLabel(role.type)} />
                  </div>
                  <div className="flex min-w-0 items-center gap-2">
                    <div
                      className={cn(
                        'flex size-[calc(26px*var(--app-scale))] shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white',
                        avatarClasses[index % avatarClasses.length],
                      )}
                    >
                      {initials(role.admin)}
                    </div>
                    <span className="truncate text-sm text-text-2">{role.admin}</span>
                  </div>
                  <div className="truncate text-[calc(13px*var(--app-scale))] text-text-2">{role.scope}</div>
                  <div className="flex items-center gap-3.5 text-[calc(13px*var(--app-scale))] text-pri">
                    <button type="button" onClick={() => toast(t('roles.toast.stub'))}>
                      {t('roles.actions.detail')}
                    </button>
                    <button type="button" onClick={() => toast(t('roles.toast.stub'))}>
                      {t('roles.actions.add')}
                    </button>
                  </div>
                </TableShellRow>
              ))}
            </TableShell>
          </div>
        )}
      </div>

      <Dialog
        open={roleDialogOpen}
        onOpenChange={(open) => {
          setRoleDialogOpen(open);
          if (!open) setRoleDraft({ ...emptyRoleDraft });
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('roles.dialog.addRoleTitle')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <label className="grid gap-2 text-[calc(13px*var(--app-scale))] text-text-2">
              <span>{t('roles.form.roleName')}</span>
              <Input
                placeholder={t('roles.form.roleNamePlaceholder')}
                value={roleDraft.name}
                onChange={(event) => setRoleDraft((current) => ({ ...current, name: event.target.value }))}
              />
            </label>
            <label className="grid gap-2 text-[calc(13px*var(--app-scale))] text-text-2">
              <span>{t('roles.form.roleDesc')}</span>
              <Input
                placeholder={t('roles.form.roleDescPlaceholder')}
                value={roleDraft.desc ?? ''}
                onChange={(event) => setRoleDraft((current) => ({ ...current, desc: event.target.value }))}
              />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
              {t('roles.actions.cancel')}
            </Button>
            <Button onClick={submitCreateRole} disabled={!roleDraft.name.trim()}>
              {t('roles.actions.confirmCreate')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={adminDialogOpen}
        onOpenChange={(open) => {
          setAdminDialogOpen(open);
          if (!open) setAdminDraft({ ...emptyAdminDraft });
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('roles.dialog.addAdminTitle')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <label className="grid gap-2 text-[calc(13px*var(--app-scale))] text-text-2">
              <span>{t('roles.form.adminRoleName')}</span>
              <Input
                placeholder={t('roles.form.adminRoleNamePlaceholder')}
                value={adminDraft.name}
                onChange={(event) => setAdminDraft((current) => ({ ...current, name: event.target.value }))}
              />
            </label>
            <label className="grid gap-2 text-[calc(13px*var(--app-scale))] text-text-2">
              <span>{t('roles.form.adminMember')}</span>
              <select
                aria-label={t('roles.form.adminMember')}
                className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-text outline-none"
                value={adminDraft.admin}
                onChange={(event) => setAdminDraft((current) => ({ ...current, admin: event.target.value }))}
              >
                <option value="">{t('roles.form.adminMemberPlaceholder')}</option>
                {selectableMembers.map((member) => (
                  <option key={member.id} value={member.name}>
                    {member.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdminDialogOpen(false)}>
              {t('roles.actions.cancel')}
            </Button>
            <Button onClick={submitCreateAdminRole} disabled={!adminDraft.name.trim() || !adminDraft.admin}>
              {t('roles.actions.confirmCreate')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title={t('roles.dialog.deleteRoleTitle')}
        description={t('roles.dialog.deleteRoleDesc')}
        cancelText={t('roles.actions.cancel')}
        confirmText={t('roles.actions.confirmDelete')}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={confirmDeleteRole}
      />
    </section>
  );
}
