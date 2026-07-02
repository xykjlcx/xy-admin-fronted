// M0 种子只含已有路由（dashboard + 成员与部门）；M1 每加一页在此补种子行。
// 权限符用原型业务域风格（spec §7.5）。
import type { SubsystemManifest } from '@/modules/types';

export const adminManifest: SubsystemManifest = {
  subsystem: {
    key: 'admin',
    label: { 'zh-CN': '后台管理', 'en-US': 'Admin' },
    desc: { 'zh-CN': '组织 · 权限 · 审计', 'en-US': 'Org · IAM · Audit' },
    icon: 'layout-grid',
    color: '#3370ff',
    home: '/admin/dashboard',
    builtin: true,
    enabled: true,
    sort: 1,
  },
  menuSeed: [
    {
      id: 'm-home',
      parentId: null,
      subsystemKey: 'admin',
      type: 'dir',
      label: { 'zh-CN': '工作台' },
      shortLabel: { 'zh-CN': '工作台' },
      icon: 'layout-dashboard',
      visible: true,
      sort: 1,
    },
    {
      id: 'm-dashboard',
      parentId: 'm-home',
      subsystemKey: 'admin',
      type: 'menu',
      label: { 'zh-CN': '企业概览' },
      path: '/admin/dashboard',
      permission: 'dashboard:view',
      visible: true,
      sort: 1,
    },
    {
      id: 'm-org',
      parentId: null,
      subsystemKey: 'admin',
      type: 'dir',
      label: { 'zh-CN': '组织与权限' },
      shortLabel: { 'zh-CN': '组织' },
      icon: 'users',
      visible: true,
      sort: 2,
    },
    {
      id: 'm-users',
      parentId: 'm-org',
      subsystemKey: 'admin',
      type: 'menu',
      label: { 'zh-CN': '成员与部门' },
      path: '/admin/users',
      permission: 'iam:user:view',
      visible: true,
      sort: 1,
    },
  ],
};
