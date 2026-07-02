// src/lib/icon-registry.tsx —— DB/菜单存图标字符串，前端映射为 lucide 组件（spec §6）
// 菜单/子系统的 icon 字段是字符串（可被后端下发），渲染时经 <Icon name> 查表，查不到兜底 LayoutGrid。
import { createElement } from 'react';
import {
  LayoutGrid,
  LayoutDashboard,
  Users,
  Shield,
  FolderOpen,
  Settings2,
  Truck,
  Link2,
  DollarSign,
  Handshake,
  BarChart3,
  ClipboardList,
  Bell,
  Search,
  Moon,
  Sun,
  Globe,
  type LucideIcon,
  type LucideProps,
} from 'lucide-react';

const registry: Record<string, LucideIcon> = {
  'layout-grid': LayoutGrid,
  'layout-dashboard': LayoutDashboard,
  users: Users,
  shield: Shield,
  'folder-open': FolderOpen,
  settings: Settings2,
  truck: Truck,
  link: Link2,
  dollar: DollarSign,
  handshake: Handshake,
  chart: BarChart3,
  clipboard: ClipboardList,
  bell: Bell,
  search: Search,
  moon: Moon,
  sun: Sun,
  globe: Globe,
};

function getIcon(key: string | undefined): LucideIcon {
  return registry[key ?? ''] ?? LayoutGrid;
}

// 动态图标渲染：用 createElement 从注册表选组件，避免"render 期创建组件"（react-hooks/static-components）。
export function Icon({ name, ...props }: { name: string | undefined } & LucideProps) {
  return createElement(getIcon(name), props);
}
