import { useMemo, useState } from 'react';
import { Folder, MoreHorizontal, Plus, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@/components/pro/ConfirmDialog';
import { StatusBadge, type StatusBadgeTone } from '@/components/pro/StatusBadge';
import { TableCheckbox, TableShell, TableShellHeader, TableShellRow } from '@/components/pro/TableShell';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { matchPermission } from '@/lib/permission';
import { cn } from '@/lib/utils';
import type {
  CreateUserInput,
  DeptDto,
  PageResult,
  UpdateUserInput,
  UserDto,
  UsersQueryParams,
} from '@/modules/admin/api/user.api';

export interface UsersViewProps {
  permissions: string[];
  depts: DeptDto[];
  usersPage: PageResult<UserDto>;
  search: UsersQueryParams;
  onSearchChange: (patch: Partial<UsersQueryParams>) => void;
  onCreateUser: (dto: CreateUserInput) => void | Promise<void>;
  onUpdateUser: (id: string, dto: UpdateUserInput) => void | Promise<void>;
  onDeleteUser: (id: string) => void | Promise<void>;
  onBatchDisable: (ids: string[]) => void | Promise<void>;
}

type TabKey = 'members' | 'depts' | 'left';

const statusOptions = [
  { value: 'all' },
  { value: 'active' },
  { value: 'disabled' },
  { value: 'unactivated' },
] satisfies { value: UsersQueryParams['status'] }[];

const emptyDraft: CreateUserInput = {
  name: '',
  deptId: '',
  role: '',
  phone: '',
  email: '',
};

const deptCountFallback: Record<string, number> = {
  rd: 6,
  rd_fe: 2,
  rd_be: 2,
  rd_qa: 1,
  mkt: 2,
  hr: 2,
  fin: 2,
  admin: 2,
};

const avatarClasses = [
  'bg-pri',
  'bg-warning',
  'bg-success',
  'bg-danger',
  'bg-pri text-white',
  'bg-warning text-white',
];
const memberGridTemplate =
  'calc(44px * var(--app-scale)) 1.4fr 1fr 1.4fr 1fr calc(120px * var(--app-scale))';
const deptGridTemplate = '1fr calc(120px * var(--app-scale)) calc(80px * var(--app-scale))';

function buildDepthMap(depts: DeptDto[]) {
  const byId = new Map(depts.map((dept) => [dept.id, dept]));
  const getDepth = (dept: DeptDto): number => {
    if (!dept.parentId) return 0;
    const parent = byId.get(dept.parentId);
    return parent ? getDepth(parent) + 1 : 0;
  };
  return new Map(depts.map((dept) => [dept.id, getDepth(dept)]));
}

function statusTone(status: UserDto['status']): StatusBadgeTone {
  if (status === 'active') return 'success';
  if (status === 'unactivated') return 'warning';
  if (status === 'left') return 'danger';
  return 'neutral';
}

function initials(name: string) {
  return name.slice(-2);
}

export function UsersView({
  permissions,
  depts,
  usersPage,
  search,
  onSearchChange,
  onCreateUser,
  onDeleteUser,
  onBatchDisable,
}: UsersViewProps) {
  const { t } = useTranslation('admin');
  const [tab, setTab] = useState<TabKey>(search.status === 'left' ? 'left' : 'members');
  const [statusOpen, setStatusOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserDto | null>(null);
  const [detailUser, setDetailUser] = useState<UserDto | null>(null);
  const [draft, setDraft] = useState<CreateUserInput>({ ...emptyDraft });
  const [deptKeyword, setDeptKeyword] = useState('');
  const deptById = useMemo(() => new Map(depts.map((dept) => [dept.id, dept])), [depts]);
  const deptDepth = useMemo(() => buildDepthMap(depts), [depts]);
  const visibleDepts = useMemo(() => {
    const keyword = deptKeyword.trim();
    if (!keyword) return depts;
    return depts.filter((dept) => dept.name.includes(keyword));
  }, [deptKeyword, depts]);
  const pageCount = Math.max(1, Math.ceil(usersPage.total / search.pageSize));
  const canCreate = matchPermission(permissions, 'iam:user:create');
  const canDelete = matchPermission(permissions, 'iam:user:del');
  const canDisable = matchPermission(permissions, 'iam:user:resign');
  const selectedDeptLabel = search.deptId ? deptById.get(search.deptId)?.name : '全部成员';
  const allPageIds = usersPage.list.map((user) => user.id);
  const selectedVisibleIds = selectedIds.filter((id) => allPageIds.includes(id));
  const allSelected = allPageIds.length > 0 && allPageIds.every((id) => selectedVisibleIds.includes(id));
  const activeTab: TabKey = search.status === 'left' ? 'left' : tab;

  const patchSearch = (patch: Partial<UsersQueryParams>) => {
    setSelectedIds([]);
    onSearchChange(patch);
  };
  const switchTab = (next: TabKey) => {
    setTab(next);
    setSelectedIds([]);
    if (next === 'left') patchSearch({ status: 'left', page: 1 });
    if (next === 'members') patchSearch({ status: 'all', page: 1 });
    if (next === 'depts' && search.status === 'left') patchSearch({ status: 'all', page: 1 });
  };
  const toggleRow = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };
  const togglePage = () => {
    setSelectedIds((current) =>
      allSelected
        ? current.filter((id) => !allPageIds.includes(id))
        : [...new Set([...current, ...allPageIds])],
    );
  };
  const submitCreate = async () => {
    await onCreateUser({ ...draft, deptId: draft.deptId || depts[0]?.id || '' });
    setDraft({ ...emptyDraft });
    setCreateOpen(false);
  };
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await onDeleteUser(deleteTarget.id);
    setSelectedIds((ids) => ids.filter((id) => id !== deleteTarget.id));
    setDeleteTarget(null);
  };
  const batchDisable = async () => {
    await onBatchDisable(selectedVisibleIds);
    setSelectedIds([]);
  };

  return (
    <section
      className="flex min-h-0 flex-col text-text"
      style={{ padding: 'calc(20px * var(--app-scale)) calc(28px * var(--app-scale))' }}
    >
      <div className="mb-4 flex items-center gap-2 text-[calc(13px*var(--app-scale))] text-text-3">
        <span>组织与权限</span>
        <span>›</span>
        <span className="text-text">{t('users.title')}</span>
      </div>

      <div className="flex min-h-[calc(640px*var(--app-scale))] flex-col overflow-hidden rounded-12 border border-border bg-surface shadow-xs">
        <div className="flex items-end border-b border-border px-6 pt-[calc(18px*var(--app-scale))]">
          {[
            ['members', t('users.tabs.members')],
            ['depts', t('users.tabs.depts')],
            ['left', t('users.tabs.left')],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={cn(
                'mr-7 border-b-2 px-1 pb-3 text-[calc(15px*var(--app-scale))]',
                activeTab === key
                  ? 'border-pri font-semibold text-text'
                  : 'border-transparent font-normal text-text-2',
              )}
              onClick={() => switchTab(key as TabKey)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex min-h-0 flex-1">
          <aside className="w-[calc(248px*var(--app-scale))] shrink-0 border-r border-border px-3 py-4">
            <div className="mb-3 flex h-[calc(34px*var(--app-scale))] items-center gap-2 rounded-8 bg-surface-2 px-2.5">
              <Search className="size-3.5 text-text-3" />
              <input
                placeholder="搜索部门"
                value={deptKeyword}
                className="min-w-0 flex-1 bg-transparent text-[calc(13px*var(--app-scale))] outline-none placeholder:text-text-3"
                onChange={(event) => setDeptKeyword(event.target.value)}
              />
            </div>
            <button
              type="button"
              className={cn(
                'mb-px flex h-9 w-full items-center gap-2 rounded-8 px-3 text-left text-sm transition-colors hover:bg-bg',
                !search.deptId ? 'bg-pri-soft font-semibold text-pri' : 'text-text-2',
              )}
              onClick={() => patchSearch({ deptId: undefined, page: 1 })}
            >
              <Folder className="size-4 opacity-70" />
              <span className="flex-1">{t('users.allDepts').replace('部门', '成员')}</span>
              <span className="text-xs text-text-3">{usersPage.total}</span>
            </button>
            {visibleDepts.map((dept) => (
              <button
                key={dept.id}
                type="button"
                className={cn(
                  'mb-px flex h-9 w-full items-center gap-2 rounded-8 pr-3 text-left text-sm transition-colors hover:bg-bg',
                  search.deptId === dept.id ? 'bg-pri-soft font-semibold text-pri' : 'text-text-2',
                )}
                style={{ paddingLeft: `calc(${12 + (deptDepth.get(dept.id) ?? 0) * 18}px * var(--app-scale))` }}
                onClick={() => patchSearch({ deptId: dept.id, page: 1 })}
              >
                <Folder className="size-4 opacity-70" />
                <span className="min-w-0 flex-1 truncate">{dept.name}</span>
                <span className="text-xs text-text-3">{deptCountFallback[dept.id] ?? 0}</span>
              </button>
            ))}
          </aside>

          <main className="flex min-w-0 flex-1 flex-col px-6 py-[calc(18px*var(--app-scale))]">
            {activeTab === 'depts' ? (
              <DeptList depts={depts} depthMap={deptDepth} t={t} />
            ) : (
              <>
                <div className="mb-4 flex items-center">
                  <span className="text-base font-bold">{selectedDeptLabel}</span>
                  <span className="ml-3 text-[calc(13px*var(--app-scale))] text-text-3">
                    共 {usersPage.total} 人
                  </span>
                </div>

                <div className="mb-4 flex items-center gap-3">
                  {activeTab === 'members' && (
                    <>
                      <div className="relative">
                        <button
                          type="button"
                          className="flex h-[calc(34px*var(--app-scale))] items-center gap-2 rounded-8 border border-border px-3 text-[calc(13px*var(--app-scale))] text-text-2 hover:border-pri"
                          onClick={() => setStatusOpen((open) => !open)}
                        >
                          <span className="text-text-3">{t('users.filters.accountStatus')}</span>
                          <span className="font-medium text-text">{t(`users.status.${search.status}`)}</span>
                          <span className="text-text-3">⌄</span>
                        </button>
                        {statusOpen && (
                          <div className="absolute left-0 top-10 z-30 w-[calc(140px*var(--app-scale))] rounded-10 border border-border bg-surface p-1.5 shadow-popover">
                            {statusOptions.map((item) => (
                              <button
                                key={item.value}
                                type="button"
                                className="flex h-[calc(34px*var(--app-scale))] w-full items-center rounded-6 px-2.5 text-left text-[calc(13px*var(--app-scale))] text-text-2 hover:bg-bg"
                                onClick={() => {
                                  setStatusOpen(false);
                                  patchSearch({ status: item.value, page: 1 });
                                }}
                              >
                                {t(`users.status.${item.value}`)}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <button className="flex h-[calc(34px*var(--app-scale))] items-center rounded-8 border border-border px-3 text-[calc(13px*var(--app-scale))] text-text-2 hover:border-pri">
                        {t('users.filters.directOnly')}
                      </button>
                    </>
                  )}
                  <div className="flex-1" />
                  {canCreate && activeTab === 'members' && (
                    <>
                      <button className="flex h-[calc(34px*var(--app-scale))] items-center rounded-8 border border-pri px-3.5 text-[calc(13px*var(--app-scale))] text-pri hover:bg-pri-soft">
                        {t('users.actions.invite')}
                      </button>
                      <button
                        className="flex h-[calc(34px*var(--app-scale))] items-center gap-1.5 rounded-8 bg-pri px-4 text-[calc(13px*var(--app-scale))] text-white hover:bg-pri-hover"
                        onClick={() => setCreateOpen(true)}
                      >
                        <Plus className="size-3.5" />
                        {t('users.actions.create')}
                      </button>
                    </>
                  )}
                </div>

                <TableShell
                  header={
                    <TableShellHeader gridTemplateColumns={memberGridTemplate}>
                      <div className="flex justify-center">
                        <TableCheckbox
                          ariaLabel={t('users.selectPage')}
                          checked={allSelected}
                          onCheckedChange={togglePage}
                        />
                      </div>
                      <div>{t('users.columns.name')}</div>
                      <div>{t('users.columns.status')}</div>
                      <div>手机号码</div>
                      <div>{t('users.columns.dept')}</div>
                      <div>{t('users.columns.actions')}</div>
                    </TableShellHeader>
                  }
                  empty={t('users.empty')}
                  selectedBar={
                    selectedVisibleIds.length > 0 && canDisable ? (
                      <div className="mt-4 flex items-center justify-between rounded-8 bg-pri-soft px-3.5 py-2.5">
                        <span className="text-[calc(13px*var(--app-scale))] text-text-2">{t('users.selectedCount', { count: selectedVisibleIds.length })}</span>
                        <Button size="sm" variant="outline" onClick={batchDisable}>
                          {t('users.actions.batchDisable')}
                        </Button>
                      </div>
                    ) : null
                  }
                  pagination={
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-[calc(13px*var(--app-scale))] text-text-3">
                        共 {usersPage.total} 名成员
                      </span>
                      <div className="flex items-center gap-2 text-[calc(13px*var(--app-scale))] text-text-2">
                        <button className="flex size-[calc(30px*var(--app-scale))] items-center justify-center rounded-7 border border-border" disabled={search.page <= 1} onClick={() => patchSearch({ page: search.page - 1 })}>
                          ‹
                        </button>
                        <button className="flex size-[calc(30px*var(--app-scale))] items-center justify-center rounded-7 border border-pri text-pri">
                          {search.page}
                        </button>
                        <button className="flex size-[calc(30px*var(--app-scale))] items-center justify-center rounded-7 border border-border" disabled={search.page >= pageCount} onClick={() => patchSearch({ page: search.page + 1 })}>
                          ›
                        </button>
                      </div>
                    </div>
                  }
                >
                  {usersPage.list.length > 0
                    ? usersPage.list.map((user, index) => (
                        <TableShellRow
                          key={user.id}
                          gridTemplateColumns={memberGridTemplate}
                          className={cn(selectedIds.includes(user.id) && 'bg-pri-soft')}
                        >
                          <div className="flex justify-center">
                            <TableCheckbox
                              ariaLabel={t('users.selectUser', { name: user.name })}
                              checked={selectedIds.includes(user.id)}
                              onCheckedChange={() => toggleRow(user.id)}
                            />
                          </div>
                          <div className="flex min-w-0 items-center gap-2.5">
                            <div className={cn('flex size-[calc(30px*var(--app-scale))] shrink-0 items-center justify-center rounded-full text-[calc(13px*var(--app-scale))] font-semibold text-white', avatarClasses[index % avatarClasses.length])}>
                              {initials(user.name)}
                            </div>
                            <span className="truncate text-sm text-text">{user.name}</span>
                          </div>
                          <div>
                            <StatusBadge tone={statusTone(user.status)}>{t(`users.status.${user.status}`)}</StatusBadge>
                          </div>
                          <div className="truncate text-[calc(13px*var(--app-scale))] text-text-2">{user.phone}</div>
                          <div className="truncate text-[calc(13px*var(--app-scale))] text-text-2">{deptById.get(user.deptId)?.name ?? '-'}</div>
                          <div className="flex items-center gap-3.5 text-[calc(13px*var(--app-scale))]">
                            <button className="text-pri" onClick={() => setDetailUser(user)}>
                              {t('users.actions.detail')}
                            </button>
                            {canDelete && (
                              <button className="font-bold leading-none text-text-3" onClick={() => setDeleteTarget(user)}>
                                <MoreHorizontal className="size-4" />
                                <span className="sr-only">{t('users.actions.deleteName', { name: user.name })}</span>
                              </button>
                            )}
                          </div>
                        </TableShellRow>
                      ))
                    : null}
                </TableShell>
              </>
            )}
          </main>
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('users.dialog.createTitle')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <Input placeholder={t('users.form.name')} value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
            <select className="h-9 rounded-md border border-border bg-surface px-3 text-sm outline-none" value={draft.deptId} onChange={(event) => setDraft((current) => ({ ...current, deptId: event.target.value }))}>
              <option value="">{t('users.form.dept')}</option>
              {depts.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
            <Input placeholder={t('users.form.role')} value={draft.role} onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value }))} />
            <Input placeholder={t('users.form.phone')} value={draft.phone} onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))} />
            <Input placeholder={t('users.form.email')} value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>{t('users.actions.cancel')}</Button>
            <Button onClick={submitCreate} disabled={!draft.name || !draft.role || !draft.phone || !draft.email}>{t('users.actions.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title={t('users.dialog.deleteTitle')}
        description={t('users.dialog.deleteDesc')}
        cancelText={t('users.actions.cancel')}
        confirmText={t('users.actions.confirmDelete')}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />

      <Sheet open={!!detailUser} onOpenChange={(open) => !open && setDetailUser(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{detailUser?.name ?? t('users.dialog.detailFallback')}</SheetTitle>
          </SheetHeader>
          {detailUser && (
            <dl className="mt-6 grid gap-4 text-sm">
              <div><dt className="text-text-3">{t('users.detail.dept')}</dt><dd className="mt-1 text-text">{deptById.get(detailUser.deptId)?.name ?? '-'}</dd></div>
              <div><dt className="text-text-3">{t('users.detail.role')}</dt><dd className="mt-1 text-text">{detailUser.role}</dd></div>
              <div><dt className="text-text-3">{t('users.detail.contact')}</dt><dd className="mt-1 text-text">{detailUser.phone}</dd><dd className="mt-1 text-text-2">{detailUser.email}</dd></div>
              <div><dt className="text-text-3">{t('users.detail.status')}</dt><dd className="mt-1 text-text">{t(`users.status.${detailUser.status}`)}</dd></div>
            </dl>
          )}
        </SheetContent>
      </Sheet>
    </section>
  );
}

function DeptList({
  depts,
  depthMap,
  t,
}: {
  depts: DeptDto[];
  depthMap: Map<string, number>;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  return (
    <div>
      <div className="mb-4 flex items-center">
        <span className="text-base font-bold">组织架构</span>
        <span className="ml-3 text-[calc(13px*var(--app-scale))] text-text-3">管理企业部门层级</span>
      </div>
      <TableShell
        className="rounded-10"
        header={
          <TableShellHeader gridTemplateColumns={deptGridTemplate} className="px-4">
            <div>部门名称</div>
            <div>成员数</div>
            <div>操作</div>
          </TableShellHeader>
        }
      >
        {depts.map((dept) => (
          <TableShellRow
            key={dept.id}
            gridTemplateColumns={deptGridTemplate}
            className="h-[calc(50px*var(--app-scale))] px-4"
          >
            <div className="flex items-center gap-2" style={{ paddingLeft: `calc(${(depthMap.get(dept.id) ?? 0) * 20}px * var(--app-scale))` }}>
              <Folder className="size-4 text-text-3" />
              <span className="text-sm text-text">{dept.name}</span>
            </div>
            <div className="text-[calc(13px*var(--app-scale))] text-text-2">{deptCountFallback[dept.id] ?? 0} 人</div>
            <button className="text-left text-[calc(13px*var(--app-scale))] text-pri">{t('users.actions.detail')}</button>
          </TableShellRow>
        ))}
      </TableShell>
    </div>
  );
}
