import { render } from '@testing-library/react';
import { beforeAll } from 'vitest';
import { i18nInit } from '@/lib/i18n';
import { DashboardView } from '@/modules/admin/pages/dashboard';
import type { DashboardOverviewDto } from '@/modules/admin/api/dashboard.api';

beforeAll(async () => {
  await i18nInit;
});

const overviewFixture: DashboardOverviewDto = {
  company: {
    mark: '倪',
    name: '小倪科技',
    status: '未认证',
    meta: '企业编号：FM4BG629BGE ｜ 软件和信息技术 · 128 人',
  },
  metrics: {
    newMembers: { value: '24', delta: '6', negative: false },
    activeUsers: { value: '96', delta: '12', negative: false },
    newRoles: { value: '3', delta: '1', negative: false },
    auditLogs: { value: '1,284', delta: '38', negative: true },
  },
  todo: {
    stats: {
      pending: { value: '10', label: '待办任务' },
      done: { value: '52', label: '已完成' },
      overdue: { value: '3', label: '未完成' },
    },
    items: {
      phone: { title: '周五给王总打电话', time: '09:00-12:00', status: '进行中' },
      onboard: { title: '周五拜访李总', time: '12:00-15:00', status: '加急' },
      interview: { title: '每周六部门例会', time: '14:00-15:00', status: '待处理' },
    },
  },
};

test('dashboard 展示卡片使用 Card 原语承接 card token', () => {
  render(<DashboardView overview={overviewFixture} />);

  const cards = document.querySelectorAll('[data-slot="card"]');

  expect(cards).toHaveLength(8);
  for (const card of cards) {
    expect(card).toHaveClass('py-(--card-spacing)');
    expect(card).toHaveClass('rounded-(--card-radius)');
    expect(card).toHaveClass('shadow-(--card-shadow)');
  }
});
