import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractRouteSource, validateDeclarations, type PermissionDeclaration, type MenuDeclaration, type PermissionReference } from './extract.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const routesRoot = join(root, 'frontend/src/routes');
const outputRoot = join(root, 'backend/api-contract/src/main/resources/permissions');
const menuManifest = join(root, 'frontend/scripts/permissions/menu-manifest.json');

async function filesUnder(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : /\.tsx?$/.test(entry.name) && entry.name !== '__root.tsx' ? [path] : [];
  }));
  return files.flat().sort();
}

function document<T>(items: T[]) {
  const body = { version: 1, items };
  const digest = createHash('sha256').update(JSON.stringify(body)).digest('hex');
  return `${JSON.stringify({ ...body, digest }, null, 2)}\n`;
}

export async function generateDocuments(routeFiles?: string[]) {
  const sources = routeFiles ?? await filesUnder(routesRoot);
  const permissions: PermissionDeclaration[] = [];
  const menus: MenuDeclaration[] = [];
  const references: PermissionReference[] = [];
  const routeIds = new Set<string>();
  for (const file of sources) {
    const result = extractRouteSource(relative(root, file), await readFile(file, 'utf8'));
    if (!routeIds.add(result.routeId)) throw new Error(`重复 routeId: ${result.routeId}`);
    permissions.push(...result.permissions);
    references.push(...result.references);
  }
  permissions.sort((a, b) => a.sourceKey.localeCompare(b.sourceKey));
  menus.sort((a, b) => a.sourceKey.localeCompare(b.sourceKey));
  validateDeclarations(permissions);
  const declared = new Set(permissions.map(item => item.code));
  const pageCodeBySource = new Map(permissions.filter(item => item.kind === 'PAGE').map(item => [item.sourceKey, item.code]));
  for (const reference of references) {
    if (!declared.has(reference.code)) throw new Error(`permissionRef 未声明: ${reference.code} (${reference.routeId})`);
  }
  const manifest = JSON.parse(await readFile(menuManifest, 'utf8')) as unknown;
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) throw new Error('menu manifest 必须是对象');
  const rootKeys = Object.keys(manifest).sort().join(',');
  if (rootKeys !== 'items,version' || Reflect.get(manifest, 'version') !== 1 || !Array.isArray(Reflect.get(manifest, 'items'))) {
    throw new Error('menu manifest root schema 非法');
  }
  const menuKeys = ['icon','labelKey','parentSourceKey','path','permission','routeKey','sort','sourceKey','subsystemKey','type','visible'].sort().join(',');
  const pageSources = new Set(permissions.filter(item => item.kind === 'PAGE').map(item => item.sourceKey));
  for (const raw of Reflect.get(manifest, 'items') as unknown[]) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw) || Object.keys(raw).sort().join(',') !== menuKeys) throw new Error('menu manifest item schema 非法');
    const item = raw as MenuDeclaration;
    if (typeof item.sourceKey !== 'string' || typeof item.subsystemKey !== 'string' || typeof item.labelKey !== 'string' ||
        typeof item.sort !== 'number' || !Number.isInteger(item.sort) || typeof item.visible !== 'boolean' ||
        (item.icon !== null && typeof item.icon !== 'string') || (item.parentSourceKey !== null && typeof item.parentSourceKey !== 'string')) {
      throw new Error(`menu manifest required field 非法: ${String(item.sourceKey)}`);
    }
    if (item.type === 'menu') {
      if (typeof item.routeKey !== 'string' || typeof item.path !== 'string' || typeof item.permission !== 'string') throw new Error(`可导航菜单字段不完整: ${item.sourceKey}`);
      if (!pageSources.has(item.sourceKey) || !declared.has(item.permission) || pageCodeBySource.get(item.sourceKey) !== item.permission) throw new Error(`菜单 sourceKey/code 未精确匹配 catalog page: ${item.sourceKey}`);
    } else if (item.type === 'dir') {
      if (item.routeKey !== null || item.path !== null || item.permission !== null) throw new Error(`display-only 目录不得可导航: ${item.sourceKey}`);
    } else throw new Error(`非法 menu type: ${String(item.type)}`);
    menus.push(item);
  }
  const menuSources = new Set(menus.map(item => item.sourceKey));
  if (menuSources.size !== menus.length) throw new Error('重复 menu sourceKey');
  for (const item of menus) if (item.parentSourceKey !== null && !menuSources.has(item.parentSourceKey)) throw new Error(`menu parent 不存在: ${item.sourceKey}`);
  for (const sourceKey of pageSources) if (!menuSources.has(sourceKey)) throw new Error(`page permission 缺 menu metadata: ${sourceKey}`);
  return {
    'permission-catalog.json': document(permissions),
    'menu-seed.json': document(menus),
  };
}

async function run(mode: string) {
  if (mode !== 'generate' && mode !== 'check') throw new Error('usage: generate.ts <generate|check>');
  const documents = await generateDocuments();
  const target = mode === 'generate' ? outputRoot : await mkdtemp(join(tmpdir(), 'metabuilder-permissions-'));
  await mkdir(target, { recursive: true });
  for (const [name, content] of Object.entries(documents)) await writeFile(join(target, name), content);
  if (mode === 'check') {
    for (const [name, content] of Object.entries(documents)) {
      const committed = await readFile(join(outputRoot, name), 'utf8').catch(() => '');
      if (committed !== content) throw new Error(`permission artifact drift: ${name}`);
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await run(process.argv[2] ?? '');
}
