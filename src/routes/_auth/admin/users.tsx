import { createFileRoute } from '@tanstack/react-router';

// M0 占位路由：Task 16「成员与部门垂直切片」替换为 DataTable 实页。
// 现在先存在，使 menu 种子 path 合法（RoutePath 收窄）+ 菜单树/漂移校验可验收。
export const Route = createFileRoute('/_auth/admin/users')({
  staticData: { label: '成员与部门', permission: 'iam:user:view', group: '组织与权限' },
  component: () => <div className="p-7 text-text">成员与部门（M0 占位，Task 16 充实）</div>,
});
