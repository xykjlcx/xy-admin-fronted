import type { LocalizedString } from '@/lib/localized';
import type { FileRouteTypes } from '@/routeTree.gen';

// ★ 编译期收窄：种子/菜单 path 只能是路由树里真实存在的路径，typo = 编译错误
export type RoutePath = FileRouteTypes['to'];

export interface Subsystem {
  key: string;
  label: LocalizedString;
  desc: LocalizedString;
  icon: string;
  color: string;
  home: RoutePath;
  builtin: boolean;
  enabled: boolean;
  sort: number;
}

export interface MenuRecord {
  id: string;
  parentId: string | null;
  subsystemKey: string;
  type: 'dir' | 'menu' | 'action';
  label: LocalizedString;
  icon?: string;
  shortLabel?: LocalizedString;
  path?: RoutePath;
  permission?: string;
  visible: boolean;
  sort: number;
}

export interface SubsystemManifest {
  subsystem: Subsystem;
  menuSeed: MenuRecord[];
}
