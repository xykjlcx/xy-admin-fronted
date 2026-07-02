import { http } from 'msw';
import { ok } from '@/mocks/http';
import { createCollection } from '@/mocks/db';
import { manifests } from '@/modules/registry';
import type { MenuRecord, Subsystem } from '@/modules/types';

// 种子灌入内存集合（menu/subsystem 是 collection 模式的第二、三个域，支持后续 CRUD）
const subsystems = createCollection<Subsystem, 'key'>(
  manifests.map((m) => m.subsystem),
  'key',
);
const menus = createCollection<MenuRecord, 'id'>(
  manifests.flatMap((m) => m.menuSeed),
  'id',
);

export const menuHandlers = [
  http.get('/api/subsystems', () => ok(subsystems.all())),
  http.get('/api/menus', ({ request }) => {
    const sub = new URL(request.url).searchParams.get('subsystem');
    return ok(menus.filter((m) => !sub || m.subsystemKey === sub));
  }),
];
