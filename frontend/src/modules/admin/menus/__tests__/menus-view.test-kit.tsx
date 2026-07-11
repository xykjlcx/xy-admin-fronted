import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, vi } from 'vitest';
import { i18nInit } from '@/lib/i18n';
import { MenusView, type MenusViewProps } from '@/modules/admin/menus';

beforeAll(async () => {
  await i18nInit;
});

export async function chooseSelectOption(label: string, optionName: string) {
  await userEvent.click(screen.getByRole('combobox', { name: label }));
  await userEvent.click(await screen.findByRole('option', { name: optionName }));
}

export function getTreeNodeButton(name: string) {
  return screen.getByRole('treeitem', { name: new RegExp(name) });
}

const subsystemsFixture = [
  {
    key: 'admin',
    label: { 'zh-CN': '后台管理' },
    desc: { 'zh-CN': '组织 · 权限 · 审计' },
    icon: 'layout-grid',
    color: '#3370ff',
    home: '/admin/dashboard',
    builtin: true,
    enabled: true,
    sort: 1,
  },
  {
    key: 'warehouse',
    label: { 'zh-CN': '仓储系统' },
    desc: { 'zh-CN': '库存 · 波次 · 拣货' },
    icon: 'folder',
    color: '#00b3a4',
    home: '/admin/dashboard',
    builtin: false,
    enabled: true,
    sort: 2,
  },
] satisfies MenusViewProps['subsystems'];

const menusFixture = [
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
    permission: 'dashboard:overview:view',
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
  {
    id: 'm-roles',
    parentId: 'm-org',
    subsystemKey: 'admin',
    type: 'menu',
    label: { 'zh-CN': '角色与权限' },
    path: '/admin/roles',
    permission: 'iam:role:view',
    visible: true,
    sort: 2,
  },
  {
    id: 'a-user-export',
    parentId: 'm-users',
    subsystemKey: 'admin',
    type: 'action',
    label: { 'zh-CN': '导出成员' },
    permission: 'iam:user:export',
    visible: true,
    sort: 1,
  },
] satisfies MenusViewProps['menus'];

function makeHandlers() {
  return {
    onActiveSubsystemChange: vi.fn(),
    onCreateSubsystem: vi.fn(),
    onCreateMenu: vi.fn(),
    onUpdateMenu: vi.fn(),
    onDeleteMenu: vi.fn(),
    onSetMenuVisibility: vi.fn(),
    onUpdateSubsystem: vi.fn(),
  };
}

export function renderMenusView(props: Partial<MenusViewProps> = {}) {
  const handlers = makeHandlers();
  return {
    ...handlers,
    ...render(
      <MenusView
        {...handlers}
        permissions={['iam:menu:view']}
        subsystems={subsystemsFixture}
        activeSubsystemKey="admin"
        menus={menusFixture}
        {...props}
      />,
    ),
  };
}
