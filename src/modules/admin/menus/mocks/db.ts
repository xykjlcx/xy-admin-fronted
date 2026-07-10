import { createCollection } from '@/mocks/db';
import { manifests } from '@/modules/registry';
import type { MenuRecord, Subsystem } from '@/modules/types';

export const subsystems = createCollection<Subsystem, 'key'>(
  manifests.map((manifest) => manifest.subsystem),
  'key',
);

export const menus = createCollection<MenuRecord, 'id'>(
  manifests.flatMap((manifest) => manifest.menuSeed),
  'id',
);
