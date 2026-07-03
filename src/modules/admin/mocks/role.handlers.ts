import { http } from 'msw';
import { biz, ok } from '@/mocks/http';
import { createCollection, genId } from '@/mocks/db';
import type {
  AdminRoleDto,
  CreateAdminRoleInput,
  CreateRoleInput,
  PermissionTreeGroupDto,
  RoleDto,
  RoleLogDto,
  RoleMemberDto,
  RolePermissionMap,
} from '@/modules/admin/api/role.api';

interface RolePermissionRow {
  roleId: string;
  permissions: RolePermissionMap;
}

const roleSeed: RoleDto[] = [
  { id: 'hr', name: '人事', type: 'system', desc: '负责人力资源相关审批与成员管理', memberDeptId: 'hr' },
  { id: 'fin', name: '财务', type: 'system', desc: '负责报销、预算等财务流程审批', memberDeptId: 'fin' },
  { id: 'it', name: 'IT', type: 'system', desc: '负责系统配置、账号与设备管理', memberDeptId: 'rd' },
  { id: 'legal', name: '法务', type: 'system', desc: '负责合同与合规相关流程审核', memberDeptId: 'admin' },
  { id: 'ops', name: '运营', type: 'custom', desc: '负责内容与文件资产的日常运营', memberDeptId: 'mkt' },
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
        id: 'audit:op',
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
        code: 'notice:notice',
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
      'audit:op': ['view'],
      'file:doc': ['view', 'upload', 'download'],
      'notice:msg': ['view'],
      'sys:org': ['view'],
    },
  },
  {
    roleId: 'fin',
    permissions: {
      'iam:user': ['view'],
      'audit:op': ['view'],
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
      'audit:op': ['view', 'export'],
      'audit:login': ['view', 'export'],
      'file:doc': ['view', 'upload', 'download', 'rename', 'del', 'share'],
      'notice:msg': ['view', 'publish', 'edit', 'del'],
      'sys:org': ['view', 'edit'],
      'sys:pref': ['view', 'edit'],
    },
  },
  {
    roleId: 'legal',
    permissions: {
      'iam:user': ['view'],
      'audit:op': ['view', 'export'],
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
      'audit:op': ['view'],
    },
  },
];

const adminRoleSeed: AdminRoleDto[] = [
  { id: 'ar-super', name: '超级管理员', type: 'system', admin: '李长昕', scope: '全部权限' },
  { id: 'ar-hr', name: '人事管理员', type: 'system', admin: '郑晓琳', scope: '人事管理模式、组织架构 +1' },
  { id: 'ar-audit', name: '日志审计员', type: 'custom', admin: '吴俊豪', scope: '日志审计、数据报表' },
  { id: 'ar-file', name: '文件管理员', type: 'custom', admin: '黄志强', scope: '文件管理' },
];

const roleLogSeed: Record<string, RoleLogDto[]> = {
  hr: [
    { id: 'hr-log-1', kind: 'grant', who: '李长昕', text: '授予 郑晓琳 此角色', time: '2 小时前' },
    { id: 'hr-log-2', kind: 'add', who: '陈雨桐', text: '新增权限 成员与部门·分配角色', time: '昨天' },
    { id: 'hr-log-3', kind: 'edit', who: '李长昕', text: '修改角色描述', time: '3 天前' },
    { id: 'hr-log-4', kind: 'create', who: '系统', text: '角色创建', time: '2025-06-18' },
  ],
  fin: [
    { id: 'fin-log-1', kind: 'add', who: '李长昕', text: '新增权限 文件管理·分享', time: '1 天前' },
    { id: 'fin-log-2', kind: 'grant', who: '郑晓琳', text: '授予 吴俊豪 此角色', time: '2 天前' },
    { id: 'fin-log-3', kind: 'create', who: '系统', text: '角色创建', time: '2025-06-18' },
  ],
  it: [
    { id: 'it-log-1', kind: 'grant', who: '李长昕', text: '授予 黄志强 此角色', time: '5 小时前' },
    { id: 'it-log-2', kind: 'add', who: '李长昕', text: '新增权限 系统设置·编辑', time: '昨天' },
    { id: 'it-log-3', kind: 'remove', who: '陈雨桐', text: '移除权限 登录日志·导出', time: '4 天前' },
    { id: 'it-log-4', kind: 'create', who: '系统', text: '角色创建', time: '2025-06-18' },
  ],
  legal: [
    { id: 'legal-log-1', kind: 'add', who: '李长昕', text: '新增权限 操作日志·导出', time: '昨天' },
    { id: 'legal-log-2', kind: 'create', who: '系统', text: '角色创建', time: '2025-06-18' },
  ],
  ops: [
    { id: 'ops-log-1', kind: 'grant', who: '李长昕', text: '授予 王小明 此角色', time: '2 小时前' },
    { id: 'ops-log-2', kind: 'add', who: '陈雨桐', text: '新增权限 通知公告·发布', time: '昨天' },
    { id: 'ops-log-3', kind: 'remove', who: '李长昕', text: '移除权限 成员与部门·删除', time: '3 天前' },
    { id: 'ops-log-4', kind: 'create', who: '系统', text: '角色创建', time: '2026-01-12' },
  ],
};

const memberSeed = [
  { id: 'u1', name: '李长昕', deptId: 'rd', deptLabel: '产品研发中心', title: '超级管理员', status: 'active' },
  { id: 'u2', name: '王思远', deptId: 'rd_fe', deptLabel: '前端组', title: '开发工程师', status: 'active' },
  { id: 'u3', name: '陈嘉怡', deptId: 'rd_be', deptLabel: '后端组', title: '开发工程师', status: 'active' },
  { id: 'u4', name: '赵敏杰', deptId: 'rd_be', deptLabel: '后端组', title: '开发工程师', status: 'active' },
  { id: 'u5', name: '刘婉婷', deptId: 'rd_qa', deptLabel: '测试组', title: '测试工程师', status: 'unactivated' },
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

const roles = createCollection<RoleDto, 'id'>(roleSeed, 'id');
const rolePermissions = createCollection<RolePermissionRow, 'roleId'>(permissionSeed, 'roleId');
const adminRoles = createCollection<AdminRoleDto, 'id'>(adminRoleSeed, 'id');

function clonePermissions(permissions: RolePermissionMap): RolePermissionMap {
  return Object.fromEntries(Object.entries(permissions).map(([resourceId, actions]) => [resourceId, [...actions]]));
}

function membersForRole(role: RoleDto | undefined): RoleMemberDto[] {
  if (!role?.memberDeptId) return [];
  const covers = deptCovers[role.memberDeptId] ?? [role.memberDeptId];
  return memberSeed
    .filter((member) => member.status !== 'left' && covers.includes(member.deptId))
    .map(({ id, name, deptLabel, title }) => ({ id, name, deptLabel, title }));
}

export const roleHandlers = [
  http.get('/api/roles', () => ok(roles.all())),

  http.post('/api/roles', async ({ request }) => {
    const body = (await request.json()) as CreateRoleInput;
    const name = body.name.trim();
    if (!name) return biz(4001, '角色名称不能为空');
    const role = roles.insert({
      id: genId('role'),
      name,
      type: 'custom',
      desc: body.desc?.trim() || '自定义业务角色',
    });
    rolePermissions.insert({ roleId: role.id, permissions: {} });
    return ok(role);
  }),

  http.get('/api/permissions/tree', () => ok(permissionTreeSeed)),

  http.get('/api/roles/:id/permissions', ({ params }) => {
    const id = String(params.id);
    if (!roles.find(id)) return biz(4040, '角色不存在');
    const row = rolePermissions.find(id);
    return ok(clonePermissions(row?.permissions ?? {}));
  }),

  http.put('/api/roles/:id/permissions', async ({ params, request }) => {
    const id = String(params.id);
    if (!roles.find(id)) return biz(4040, '角色不存在');
    const permissions = clonePermissions((await request.json()) as RolePermissionMap);
    const updated = rolePermissions.update(id, { permissions });
    if (!updated) rolePermissions.insert({ roleId: id, permissions });
    return ok(permissions);
  }),

  http.get('/api/roles/:id/members', ({ params }) => {
    const role = roles.find(String(params.id));
    return role ? ok(membersForRole(role)) : biz(4040, '角色不存在');
  }),

  http.get('/api/roles/:id/logs', ({ params }) => {
    const id = String(params.id);
    if (!roles.find(id)) return biz(4040, '角色不存在');
    return ok(roleLogSeed[id] ?? [{ id: `${id}-log-create`, kind: 'create', who: '系统', text: '角色创建', time: '刚刚' }]);
  }),

  http.delete('/api/roles/:id', ({ params }) => {
    const id = String(params.id);
    const role = roles.find(id);
    if (!role) return biz(4040, '角色不存在');
    if (role.type === 'system') return biz(4004, '系统角色不可删除');
    roles.remove(id);
    rolePermissions.remove(id);
    return ok(null);
  }),

  http.get('/api/admin-roles', () => ok(adminRoles.all())),

  http.post('/api/admin-roles', async ({ request }) => {
    const body = (await request.json()) as CreateAdminRoleInput;
    const name = body.name.trim();
    if (!name || !body.admin) return biz(4001, '角色名称和管理员不能为空');
    const role = adminRoles.insert({
      id: genId('admin-role'),
      name,
      type: 'custom',
      admin: body.admin,
      scope: body.scope?.trim() || '指定模块管理权限',
    });
    return ok(role);
  }),
];
