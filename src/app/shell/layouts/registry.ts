import type { ComponentType } from 'react';
import type { ShellLayoutProps } from './types';
import { SidebarLayout } from './SidebarLayout';

// 布局注册表：新增布局 = 新文件 + 此处加一行（rail/inset 在 Task 13 注册）。
export const layoutRegistry: Record<string, ComponentType<ShellLayoutProps>> = {
  sidebar: SidebarLayout,
};
