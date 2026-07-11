import { setupServer } from 'msw/node';
import { resetDb } from '@/mocks/db';
import { usersModuleHandlers } from '@/modules/admin/users/mocks';
import { buildDepthMap, collectDeptSubtreeIds } from '@/modules/admin/users/model';
import type { DeptDto } from '@/modules/admin/users/api';

const dept = (id: string, parentId: string | null): DeptDto => ({
  id,
  parentId,
  name: id,
  sort: 0,
  memberCount: 0,
});

describe('collectDeptSubtreeIds', () => {
  const tree: DeptDto[] = [
    dept('root', null),
    dept('c1', 'root'),
    dept('c2', 'root'),
    dept('g1', 'c1'),
    dept('g2', 'c1'),
    dept('other', null),
  ];

  test('collects the root itself and every descendant', () => {
    expect(collectDeptSubtreeIds(tree, 'root')).toEqual(new Set(['root', 'c1', 'c2', 'g1', 'g2']));
  });

  test('collects only the branch under a mid-level node', () => {
    expect(collectDeptSubtreeIds(tree, 'c1')).toEqual(new Set(['c1', 'g1', 'g2']));
  });

  test('resolves a leaf to just itself', () => {
    expect(collectDeptSubtreeIds(tree, 'g1')).toEqual(new Set(['g1']));
  });

  test('terminates on cyclic parent links without overflowing the stack', () => {
    const cyclic: DeptDto[] = [dept('a', 'b'), dept('b', 'a')];
    expect(() => collectDeptSubtreeIds(cyclic, 'a')).not.toThrow();
    expect(collectDeptSubtreeIds(cyclic, 'a')).toEqual(new Set(['a', 'b']));
  });
});

describe('buildDepthMap', () => {
  test('computes depth from the parent chain', () => {
    const depth = buildDepthMap([dept('root', null), dept('c1', 'root'), dept('g1', 'c1')]);
    expect(depth.get('root')).toBe(0);
    expect(depth.get('c1')).toBe(1);
    expect(depth.get('g1')).toBe(2);
  });

  test('does not stack overflow on a cyclic parent chain', () => {
    const cyclic: DeptDto[] = [dept('a', 'b'), dept('b', 'a')];
    let depth: Map<string, number> | undefined;
    expect(() => {
      depth = buildDepthMap(cyclic);
    }).not.toThrow();
    expect(depth?.size).toBe(2);
    for (const value of depth?.values() ?? []) {
      expect(Number.isFinite(value)).toBe(true);
    }
  });
});

describe('dept update handler cycle guard', () => {
  const server = setupServer(...usersModuleHandlers);
  beforeAll(() => server.listen());
  afterEach(() => resetDb());
  afterAll(() => server.close());

  async function putDeptParent(id: string, parentId: string | null) {
    const res = await fetch(`/api/depts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parentId }),
    });
    return (await res.json()) as { code: number; message: string };
  }

  test('rejects choosing itself as parent', async () => {
    expect((await putDeptParent('rd', 'rd')).code).toBe(4001);
  });

  test('rejects choosing a descendant as parent', async () => {
    // rd_fe 是 rd 的下级，选它作上级会造出环
    expect((await putDeptParent('rd', 'rd_fe')).code).toBe(4001);
  });

  test('allows a non-cyclic reparent', async () => {
    expect((await putDeptParent('rd_fe', 'mkt')).code).toBe(0);
  });
});
