import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getTreeNodeButton, renderMenusView } from './menus-view.test-kit';

test('viewer 能看子系统区和菜单树，但看不到写操作', () => {
  renderMenusView();

  expect(screen.getByRole('region', { name: '子系统列表' })).toBeInTheDocument();
  expect(screen.getByRole('region', { name: '后台管理菜单树' })).toBeInTheDocument();
  expect(screen.getByText('企业概览')).toBeInTheDocument();
  expect(screen.queryByText('导出成员')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '新增菜单' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '新增子系统' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '编辑企业概览' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '删除企业概览' })).not.toBeInTheDocument();
});

test('菜单管理采用 2:3:5 子系统、菜单和详情三栏工作区', () => {
  renderMenusView({ permissions: ['*:*:*'] });

  const subsystemList = screen.getByRole('region', { name: '子系统列表' });
  const workspace = screen.getByRole('region', { name: '菜单配置工作区' });
  const menuTreePanel = screen.getByRole('region', { name: '后台管理菜单树' });
  const inspector = screen.getByRole('complementary', { name: '节点详情' });
  const surface = screen.getByTestId('menu-management-surface');

  expect(surface).toContainElement(subsystemList);
  expect(surface).toContainElement(workspace);
  expect(screen.getByTestId('page-three-pane')).toContainElement(subsystemList);
  expect(within(subsystemList).getByRole('heading', { name: '子系统管理' })).toBeInTheDocument();
  expect(within(subsystemList).getByRole('button', { name: '选择后台管理子系统' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  expect(within(subsystemList).getByRole('button', { name: '选择仓储系统子系统' })).not.toHaveAttribute(
    'aria-current',
  );
  expect(within(menuTreePanel).getByRole('tree', { name: '菜单导航树' })).toBeInTheDocument();
  expect(within(inspector).getByRole('heading', { name: '菜单详情' })).toBeInTheDocument();
  expect(within(inspector).getByText('工作台')).toBeInTheDocument();
});

test('点击子系统卡片只上报子系统变更', async () => {
  const { onActiveSubsystemChange } = renderMenusView({ permissions: ['*:*:*'] });

  const region = screen.getByRole('region', { name: '子系统列表' });
  await userEvent.click(within(region).getByRole('button', { name: '选择仓储系统子系统' }));

  expect(onActiveSubsystemChange).toHaveBeenCalledWith('warehouse');
});

test('菜单树工具条、搜索区和节点树具有明确语义', () => {
  renderMenusView({ permissions: ['*:*:*'] });

  const treePanel = screen.getByRole('region', { name: '后台管理菜单树' });
  const toolbar = within(treePanel).getByRole('toolbar', { name: '菜单树工具栏' });
  expect(toolbar).toContainElement(screen.getByRole('heading', { name: '菜单管理' }));
  expect(within(treePanel).getByRole('searchbox', { name: '搜索菜单' })).toBeInTheDocument();
  expect(within(treePanel).getByRole('treeitem', { name: /工作台/ })).toHaveAttribute(
    'aria-selected',
    'true',
  );
});

test('节点详情按基本信息和页面操作组织', async () => {
  renderMenusView({ permissions: ['*:*:*'] });

  const inspector = screen.getByRole('complementary', { name: '节点详情' });
  expect(within(inspector).getByRole('region', { name: '基本信息' })).toBeInTheDocument();
  await userEvent.click(getTreeNodeButton('成员与部门'));
  const actionRegion = within(inspector).getByRole('region', { name: '页面操作' });
  expect(actionRegion).toHaveTextContent('导出成员');
  expect(actionRegion.querySelector('[data-slot="description-list"]')).toHaveAttribute(
    'data-presentation',
    'cards',
  );
  expect(actionRegion.closest('[data-slot="page-pane-body"]')).toHaveAttribute('data-tone', 'canvas');
});

test('菜单树工具栏使用单行结构摘要', () => {
  renderMenusView({ permissions: ['*:*:*'] });

  const toolbar = screen.getByRole('toolbar', { name: '菜单树工具栏' });
  expect(within(toolbar).getByText('共 5 个导航节点')).toBeInTheDocument();
  expect(within(toolbar).queryByText(/目录 2/)).not.toBeInTheDocument();
  expect(within(toolbar).getByRole('button', { name: '新增菜单' })).toBeInTheDocument();
});

test('目录节点可新增页面，页面节点不提供该入口', async () => {
  renderMenusView({ permissions: ['*:*:*'] });

  const tree = screen.getByRole('tree', { name: '菜单导航树' });
  expect(within(tree).queryByRole('button', { name: '在企业概览下新增页面' })).not.toBeInTheDocument();
  await userEvent.click(within(tree).getByRole('button', { name: '在工作台下新增页面' }));

  const dialog = screen.getByRole('dialog', { name: '新增菜单' });
  expect(within(dialog).getByRole('combobox', { name: '节点类型' })).toBeDisabled();
  expect(within(dialog).getByRole('combobox', { name: '父级菜单' })).toBeDisabled();
});

test('菜单树暴露标准展开和选中状态', async () => {
  renderMenusView({ permissions: ['*:*:*'] });

  const activeTreeItem = getTreeNodeButton('工作台');
  const inactiveTreeItem = getTreeNodeButton('企业概览');
  expect(screen.getByRole('button', { name: '展开或折叠工作台' })).toHaveAttribute('aria-expanded', 'true');
  expect(activeTreeItem).toHaveAttribute('aria-selected', 'true');

  await userEvent.click(inactiveTreeItem);
  expect(inactiveTreeItem).toHaveAttribute('aria-selected', 'true');
});

test('菜单树使用管理型连续列表并把节点标识作为次级信息展示', () => {
  renderMenusView({ permissions: ['*:*:*'] });

  const tree = screen.getByRole('tree', { name: '菜单导航树' });
  expect(tree).toHaveAttribute('data-variant', 'management');
  expect(within(tree).getByText('m-home')).toHaveAttribute('data-slot', 'tree-description');
});

test('动作节点不进入菜单树，只在所属页面详情中管理', async () => {
  renderMenusView({ permissions: ['*:*:*'] });

  const menuTreePanel = screen.getByRole('region', { name: '后台管理菜单树' });
  expect(within(menuTreePanel).queryByText('导出成员')).not.toBeInTheDocument();
  await userEvent.click(getTreeNodeButton('成员与部门'));

  const actionRegion = screen.getByRole('region', { name: '页面操作' });
  expect(within(actionRegion).getByText('iam:user:export')).toBeInTheDocument();
  expect(within(actionRegion).getByRole('button', { name: '编辑导出成员' })).toBeInTheDocument();
  expect(within(actionRegion).getByRole('button', { name: '删除导出成员' })).toBeInTheDocument();
});

test('从页面详情新增操作时锁定动作类型和所属页面', async () => {
  renderMenusView({ permissions: ['*:*:*'] });

  await userEvent.click(getTreeNodeButton('成员与部门'));
  await userEvent.click(screen.getByRole('button', { name: '新增操作' }));
  const dialog = screen.getByRole('dialog', { name: '新增菜单' });
  expect(within(dialog).getByRole('combobox', { name: '节点类型' })).toBeDisabled();
  expect(within(dialog).getByRole('combobox', { name: '父级菜单' })).toBeDisabled();
});

test('点击菜单树节点后详情面板展示该节点配置', async () => {
  renderMenusView({ permissions: ['*:*:*'] });

  await userEvent.click(getTreeNodeButton('角色与权限'));
  const inspector = screen.getByRole('complementary', { name: '节点详情' });
  expect(within(inspector).getByText('/admin/roles')).toBeInTheDocument();
  expect(within(inspector).getByText('iam:role:view')).toBeInTheDocument();
  expect(within(inspector).getByText('已显示')).toBeInTheDocument();
});
