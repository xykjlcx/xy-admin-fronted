import type { ManagedMenuType } from './api';
import type { MenuRecord, Subsystem } from '@/modules/types';

export type MenuFormState =
  | { mode: 'create'; parentId: string | null; type: ManagedMenuType }
  | { mode: 'edit'; menu: MenuRecord };

export type SubsystemFormState = { mode: 'create' } | { mode: 'edit'; subsystem: Subsystem };

export interface MenuCapabilities {
  create: boolean;
  update: boolean;
  delete: boolean;
  toggle: boolean;
}

export type MenuOverlay =
  | { kind: 'none' }
  | { kind: 'menu-form'; state: MenuFormState }
  | { kind: 'subsystem-form'; state: SubsystemFormState }
  | { kind: 'delete'; menu: MenuRecord };
