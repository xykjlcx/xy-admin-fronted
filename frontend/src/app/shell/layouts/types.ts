import type { ReactNode } from 'react';
import type { MenuNode } from '@/lib/menu-tree';
import type { Subsystem } from '@/modules/types';

// 布局契约（spec §8.2）：Shell 统一取数后把这些 props 下发；布局只负责组合部件与摆位。
export interface ShellLayoutProps {
  menuTree: MenuNode[];
  subsystems: Subsystem[];
  collapsed: boolean;
  onCollapsedChange: (v: boolean) => void;
  children: ReactNode;
}
