import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_auth/admin/dashboard')({
  staticData: { label: '企业概览', permission: 'dashboard:view', group: '工作台' },
  component: () => <div className="p-7 text-text">Dashboard（M1 充实）</div>,
});
