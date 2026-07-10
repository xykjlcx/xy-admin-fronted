import { buildDepthMap, collectDeptSubtreeIds } from '@/modules/admin/users/model';
import type { DeptDto } from '@/modules/admin/users/api';

function dept(id: string, parentId: string | null): DeptDto {
  return { id, parentId, name: id, sort: 0, memberCount: 0 };
}

const tree: DeptDto[] = [
  dept('rd', null),
  dept('rd_fe', 'rd'),
  dept('rd_be', 'rd'),
  dept('rd_be_svc', 'rd_be'),
  dept('mkt', null),
];

test('collectDeptSubtreeIds returns the node together with all descendants', () => {
  expect(collectDeptSubtreeIds(tree, 'rd')).toEqual(new Set(['rd', 'rd_fe', 'rd_be', 'rd_be_svc']));
  expect(collectDeptSubtreeIds(tree, 'rd_be')).toEqual(new Set(['rd_be', 'rd_be_svc']));
  expect(collectDeptSubtreeIds(tree, 'mkt')).toEqual(new Set(['mkt']));
});

test('collectDeptSubtreeIds terminates on a cyclic parent chain', () => {
  const cyclic: DeptDto[] = [dept('a', 'b'), dept('b', 'a'), dept('c', 'b')];
  expect(collectDeptSubtreeIds(cyclic, 'a')).toEqual(new Set(['a', 'b', 'c']));
});

test('buildDepthMap computes acyclic depths from the parent chain', () => {
  const map = buildDepthMap(tree);
  expect(map.get('rd')).toBe(0);
  expect(map.get('rd_fe')).toBe(1);
  expect(map.get('rd_be_svc')).toBe(2);
  expect(map.get('mkt')).toBe(0);
});

test('buildDepthMap stays finite on a cyclic parent chain instead of overflowing', () => {
  const cyclic: DeptDto[] = [dept('a', 'b'), dept('b', 'a')];
  let map: Map<string, number> | undefined;
  expect(() => {
    map = buildDepthMap(cyclic);
  }).not.toThrow();
  expect(Number.isFinite(map?.get('a'))).toBe(true);
  expect(Number.isFinite(map?.get('b'))).toBe(true);
});
