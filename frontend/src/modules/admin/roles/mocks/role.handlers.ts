import { http } from 'msw';
import { biz, ok, noContent } from '@/mocks/http';
import { genId } from '@/mocks/db';
import type {
  CreateRoleInput,
  PermissionTreeGroupDto,
  RoleAuditLogDto,
  RoleDataPermission,
  RoleDto,
  RoleMemberDto,
  RolePermissionMap,
} from '@/modules/admin/roles/api';
import { normalizeRoleDataPermission } from '@/modules/admin/roles/api';
import { createRoleMockDb, type RoleDataPermissionRow, type RolePermissionRow } from './db';

const roleSeed: RoleDto[] = [
  {
    id: 'superadmin',
    name: '超级管理员',
    type: 'system',
    desc: '负责平台全部功能、数据与安全策略管理',
    memberDeptId: 'rd',
  },
  {
    id: 'platform-owner',
    name: '平台负责人',
    type: 'system',
    desc: '负责平台运营配置与跨部门业务协同',
    memberDeptId: 'rd',
  },
  { id: 'hr', name: '人事', type: 'system', desc: '负责人力资源相关审批与成员管理', memberDeptId: 'hr' },
  { id: 'fin', name: '财务', type: 'system', desc: '负责报销、预算等财务流程审批', memberDeptId: 'fin' },
  { id: 'it', name: 'IT', type: 'system', desc: '负责系统配置、账号与设备管理', memberDeptId: 'rd' },
  { id: 'legal', name: '法务', type: 'system', desc: '负责合同与合规相关流程审核', memberDeptId: 'admin' },
  { id: 'ops', name: '运营', type: 'custom', desc: '负责内容与文件资产的日常运营', memberDeptId: 'mkt' },
  {
    id: 'audit-reviewer',
    name: '日志审计员',
    type: 'custom',
    desc: '负责安全审计与操作日志核查',
    memberDeptId: 'admin',
  },
  {
    id: 'file-manager',
    name: '文件管理员',
    type: 'custom',
    desc: '负责企业文件资产的维护与授权',
    memberDeptId: 'fin',
  },
];

const permissionTreeSeed: PermissionTreeGroupDto[] = [
  {
    id: 'iam',
    label: '组织与权限',
    resources: [
      {
        id: 'iam:user',
        label: '成员与部门',
        code: 'iam:user',
        actions: [
          { id: 'view', label: '查看' },
          { id: 'create', label: '新建' },
          { id: 'edit', label: '编辑' },
          { id: 'del', label: '删除' },
          { id: 'resetpwd', label: '重置密码' },
          { id: 'assign', label: '分配角色' },
        ],
      },
      {
        id: 'iam:dept',
        label: '部门管理',
        code: 'iam:dept',
        actions: [
          { id: 'view', label: '查看' },
          { id: 'create', label: '新建' },
          { id: 'edit', label: '编辑' },
          { id: 'del', label: '删除' },
        ],
      },
      {
        id: 'iam:role',
        label: '角色管理',
        code: 'iam:role',
        actions: [
          { id: 'view', label: '查看' },
          { id: 'create', label: '新建' },
          { id: 'edit', label: '编辑' },
          { id: 'del', label: '删除' },
          { id: 'grant', label: '分配权限' },
        ],
      },
      {
        id: 'iam:menu',
        label: '菜单管理',
        code: 'iam:menu',
        actions: [
          { id: 'view', label: '查看' },
          { id: 'create', label: '新建' },
          { id: 'update', label: '编辑' },
          { id: 'toggle', label: '显示切换' },
          { id: 'del', label: '删除' },
        ],
      },
    ],
  },
  {
    id: 'audit',
    label: '安全审计',
    resources: [
      {
        id: 'audit:oplog',
        label: '操作日志',
        code: 'audit:oplog',
        actions: [
          { id: 'view', label: '查看' },
          { id: 'export', label: '导出' },
        ],
      },
      {
        id: 'audit:login',
        label: '登录日志',
        code: 'audit:login',
        actions: [
          { id: 'view', label: '查看' },
          { id: 'export', label: '导出' },
        ],
      },
    ],
  },
  {
    id: 'file',
    label: '文件中心',
    resources: [
      {
        id: 'file:doc',
        label: '文件管理',
        code: 'file:doc',
        actions: [
          { id: 'view', label: '查看' },
          { id: 'upload', label: '上传' },
          { id: 'download', label: '下载' },
          { id: 'rename', label: '重命名' },
          { id: 'del', label: '删除' },
          { id: 'share', label: '分享' },
        ],
      },
    ],
  },
  {
    id: 'notice',
    label: '消息中心',
    resources: [
      {
        id: 'notice:msg',
        label: '通知公告',
        code: 'notice:msg',
        actions: [
          { id: 'view', label: '查看' },
          { id: 'publish', label: '发布' },
          { id: 'edit', label: '编辑' },
          { id: 'del', label: '删除' },
        ],
      },
    ],
  },
  {
    id: 'sys',
    label: '系统设置',
    resources: [
      {
        id: 'sys:org',
        label: '企业信息',
        code: 'sys:org',
        actions: [
          { id: 'view', label: '查看' },
          { id: 'edit', label: '编辑' },
        ],
      },
      {
        id: 'sys:pref',
        label: '系统偏好',
        code: 'sys:pref',
        actions: [
          { id: 'view', label: '查看' },
          { id: 'edit', label: '编辑' },
        ],
      },
      {
        id: 'sys:dict',
        label: '字典管理',
        code: 'sys:dict',
        actions: [
          { id: 'view', label: '查看' },
          { id: 'create', label: '新建' },
          { id: 'update', label: '编辑' },
          { id: 'delete', label: '删除' },
        ],
      },
    ],
  },
];

const permissionSeed: RolePermissionRow[] = [
  {
    roleId: 'hr',
    permissions: {
      'iam:user': ['view', 'create', 'edit', 'del', 'resetpwd', 'assign'],
      'iam:dept': ['view', 'create', 'edit'],
      'iam:role': ['view'],
      'audit:oplog': ['view'],
      'file:doc': ['view', 'upload', 'download'],
      'notice:msg': ['view'],
      'sys:org': ['view'],
    },
  },
  {
    roleId: 'fin',
    permissions: {
      'iam:user': ['view'],
      'audit:oplog': ['view'],
      'file:doc': ['view', 'upload', 'download', 'rename', 'del', 'share'],
      'notice:msg': ['view'],
    },
  },
  {
    roleId: 'it',
    permissions: {
      'iam:user': ['view', 'create', 'edit', 'del', 'resetpwd', 'assign'],
      'iam:dept': ['view', 'create', 'edit', 'del'],
      'iam:role': ['view', 'create', 'edit', 'del', 'grant'],
      'audit:oplog': ['view', 'export'],
      'audit:login': ['view', 'export'],
      'file:doc': ['view', 'upload', 'download', 'rename', 'del', 'share'],
      'notice:msg': ['view', 'publish', 'edit', 'del'],
      'sys:org': ['view', 'edit'],
      'sys:pref': ['view', 'edit'],
      'sys:dict': ['view', 'create', 'update', 'delete'],
    },
  },
  {
    roleId: 'legal',
    permissions: {
      'iam:user': ['view'],
      'audit:oplog': ['view', 'export'],
      'audit:login': ['view'],
      'file:doc': ['view', 'download'],
      'notice:msg': ['view'],
    },
  },
  {
    roleId: 'ops',
    permissions: {
      'iam:user': ['view'],
      'file:doc': ['view', 'upload', 'download', 'rename'],
      'notice:msg': ['view', 'publish', 'edit'],
      'audit:oplog': ['view'],
    },
  },
];

const defaultDataPermission: RoleDataPermission = {
  defaultScope: 'dept',
  defaultDepartmentIds: [],
  resources: {},
};

const dataPermissionSeed: RoleDataPermissionRow[] = roleSeed.map((role) => ({
  roleId: role.id,
  permission:
    role.id === 'superadmin'
      ? {
          defaultScope: 'all',
          defaultDepartmentIds: [],
          resources: {},
        }
      : defaultDataPermission,
}));

const roleAuditLogSeed: RoleAuditLogDto[] = [
  {
    id: 'audit-fin-share',
    occurredAt: '2026-07-09 15:42',
    operator: '李长昕',
    roleId: 'fin',
    roleName: '财务',
    kind: 'grant',
    change: '新增功能权限：文件管理 · 分享',
  },
  {
    id: 'audit-hr-member',
    occurredAt: '2026-07-09 10:18',
    operator: '陈雨桐',
    roleId: 'hr',
    roleName: '人事',
    kind: 'grant',
    change: '授予郑晓琳人事角色',
  },
  {
    id: 'audit-it-scope',
    occurredAt: '2026-07-08 17:06',
    operator: '李长昕',
    roleId: 'it',
    roleName: 'IT',
    kind: 'dataScope',
    change: '数据范围调整为本部门及下级部门',
  },
  {
    id: 'audit-ops-permission',
    occurredAt: '2026-07-08 11:30',
    operator: '陈雨桐',
    roleId: 'ops',
    roleName: '运营',
    kind: 'remove',
    change: '移除功能权限：成员与部门 · 删除',
  },
];

const memberSeed = [
  {
    id: 'u1',
    name: '李长昕',
    deptId: 'rd',
    deptLabel: '产品研发中心',
    title: '超级管理员',
    status: 'active',
  },
  { id: 'u2', name: '王思远', deptId: 'rd_fe', deptLabel: '前端组', title: '开发工程师', status: 'active' },
  { id: 'u3', name: '陈嘉怡', deptId: 'rd_be', deptLabel: '后端组', title: '开发工程师', status: 'active' },
  { id: 'u4', name: '赵敏杰', deptId: 'rd_be', deptLabel: '后端组', title: '开发工程师', status: 'active' },
  {
    id: 'u5',
    name: '刘婉婷',
    deptId: 'rd_qa',
    deptLabel: '测试组',
    title: '测试工程师',
    status: 'unactivated',
  },
  { id: 'u6', name: '孙浩然', deptId: 'mkt', deptLabel: '市场营销部', title: '市场专员', status: 'active' },
  { id: 'u7', name: '周雅雯', deptId: 'mkt', deptLabel: '市场营销部', title: '市场经理', status: 'active' },
  { id: 'u8', name: '吴俊豪', deptId: 'hr', deptLabel: '人力资源部', title: 'HRBP', status: 'active' },
  { id: 'u9', name: '郑晓琳', deptId: 'hr', deptLabel: '人力资源部', title: 'HR经理', status: 'disabled' },
  { id: 'u10', name: '黄志强', deptId: 'fin', deptLabel: '财务部', title: '财务专员', status: 'active' },
  { id: 'u11', name: '马晓东', deptId: 'fin', deptLabel: '财务部', title: '财务经理', status: 'active' },
  { id: 'u12', name: '林佳慧', deptId: 'admin', deptLabel: '行政部', title: '行政专员', status: 'active' },
  { id: 'u14', name: '董雨桐', deptId: 'admin', deptLabel: '行政部', title: '行政经理', status: 'active' },
];

const deptCovers: Record<string, string[]> = {
  rd: ['rd', 'rd_fe', 'rd_be', 'rd_qa'],
  mkt: ['mkt'],
  hr: ['hr'],
  fin: ['fin'],
  admin: ['admin'],
};

const { roles, rolePermissions, roleDataPermissions, roleAuditLogs } = createRoleMockDb({
  roles: roleSeed,
  permissions: permissionSeed,
  dataPermissions: dataPermissionSeed,
  auditLogs: roleAuditLogSeed,
});

function clonePermissions(permissions: RolePermissionMap): RolePermissionMap {
  return Object.fromEntries(
    Object.entries(permissions).map(([resourceId, actions]) => [resourceId, [...actions]]),
  );
}

function cloneDataPermission(permission: RoleDataPermission): RoleDataPermission {
  return structuredClone(permission);
}

function membersForRole(role: RoleDto | undefined): RoleMemberDto[] {
  if (!role?.memberDeptId) return [];
  const covers = deptCovers[role.memberDeptId] ?? [role.memberDeptId];
  return memberSeed
    .filter((member) => member.status !== 'left' && covers.includes(member.deptId))
    .map(({ id, name, deptLabel, title }) => ({ id, name, deptLabel, title }));
}

function appendRoleAudit(role: RoleDto, kind: RoleAuditLogDto['kind'], change: string) {
  roleAuditLogs.insert({
    id: genId('role-audit'),
    occurredAt: new Date().toISOString(),
    operator: '李长昕',
    roleId: role.id,
    roleName: role.name,
    kind,
    change,
  });
}

export const roleHandlers = [
  http.get('/api/roles', () => ok(roles.all())),

  http.get('/api/role-audit-logs', () =>
    ok([...roleAuditLogs.all()].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))),
  ),

  http.post('/api/roles', async ({ request }) => {
    const body = (await request.json()) as CreateRoleInput;
    const name = body.name.trim();
    if (!name) return biz({ status: 400, code: 'role.name.invalid', detail: '角色名称不能为空' });
    const role = roles.insert({
      id: genId('role'),
      name,
      type: 'custom',
      desc: body.desc?.trim() || '自定义业务角色',
    });
    rolePermissions.insert({ roleId: role.id, permissions: {} });
    roleDataPermissions.insert({ roleId: role.id, permission: cloneDataPermission(defaultDataPermission) });
    appendRoleAudit(role, 'create', '创建角色');
    return ok(role);
  }),

  http.get('/api/roles/:id', ({ params }) => {
    const role = roles.find(String(params.id));
    return role ? ok(role) : biz({ status: 404, code: 'role.not-found', detail: '角色不存在' });
  }),

  http.put('/api/roles/:id', async ({ params, request }) => {
    const id = String(params.id);
    const role = roles.find(id);
    if (!role) return biz({ status: 404, code: 'role.not-found', detail: '角色不存在' });
    if (role.type === 'system') return biz({ status: 409, code: 'role.system.protected', detail: '系统角色不可修改' });
    const body = (await request.json()) as CreateRoleInput;
    if (!body.name?.trim()) return biz({ status: 400, code: 'request.validation.failed', detail: '角色名称不能为空' });
    const updated = roles.update(id, { name: body.name.trim(), desc: body.desc?.trim() ?? '' })!;
    appendRoleAudit(updated, 'edit', '更新角色');
    return ok(updated);
  }),

  http.post('/api/roles/:id/disable', ({ params }) => {
    const id = String(params.id);
    const role = roles.find(id);
    if (!role) return biz({ status: 404, code: 'role.not-found', detail: '角色不存在' });
    if (role.type === 'system') return biz({ status: 409, code: 'role.system.protected', detail: '系统角色不可停用' });
    appendRoleAudit(role, 'remove', '停用角色');
    roles.remove(id);
    return noContent();
  }),

  http.get('/api/permissions/tree', () => ok(permissionTreeSeed)),

  http.get('/api/roles/:id/permissions', ({ params }) => {
    const id = String(params.id);
    if (!roles.find(id)) return biz({ status: 404, code: 'role.not-found', detail: '角色不存在' });
    const row = rolePermissions.find(id);
    return ok(clonePermissions(row?.permissions ?? {}));
  }),

  http.put('/api/roles/:id/permissions', async ({ params, request }) => {
    const id = String(params.id);
    const role = roles.find(id);
    if (!role) return biz({ status: 404, code: 'role.not-found', detail: '角色不存在' });
    const permissions = clonePermissions((await request.json()) as RolePermissionMap);
    const updated = rolePermissions.update(id, { permissions });
    if (!updated) rolePermissions.insert({ roleId: id, permissions });
    appendRoleAudit(role, 'grant', '更新角色功能权限');
    return ok(permissions);
  }),

  http.get('/api/roles/:id/data-permissions', ({ params }) => {
    const id = String(params.id);
    if (!roles.find(id)) return biz({ status: 404, code: 'role.not-found', detail: '角色不存在' });
    return ok(cloneDataPermission(roleDataPermissions.find(id)?.permission ?? defaultDataPermission));
  }),

  http.put('/api/roles/:id/data-permissions', async ({ params, request }) => {
    const id = String(params.id);
    const role = roles.find(id);
    if (!role) return biz({ status: 404, code: 'role.not-found', detail: '角色不存在' });
    const permission = normalizeRoleDataPermission((await request.json()) as RoleDataPermission);
    const updated = roleDataPermissions.update(id, { permission });
    if (!updated) roleDataPermissions.insert({ roleId: id, permission });
    appendRoleAudit(role, 'dataScope', '更新角色数据权限');
    return ok(cloneDataPermission(permission));
  }),

  http.get('/api/roles/:id/members', ({ params }) => {
    const role = roles.find(String(params.id));
    return role ? ok(membersForRole(role)) : biz({ status: 404, code: 'role.not-found', detail: '角色不存在' });
  }),

  http.delete('/api/roles/:id', ({ params }) => {
    const id = String(params.id);
    const role = roles.find(id);
    if (!role) return biz({ status: 404, code: 'role.not-found', detail: '角色不存在' });
    if (role.type === 'system') return biz({ status: 409, code: 'role.system.protected', detail: '系统角色不可删除' });
    appendRoleAudit(role, 'remove', '删除角色');
    roles.remove(id);
    rolePermissions.remove(id);
    roleDataPermissions.remove(id);
    return noContent();
  }),
];
