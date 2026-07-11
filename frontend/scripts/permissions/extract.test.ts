import { describe, expect, it } from 'vitest';
import { extractRouteSource, validateDeclarations } from './extract.ts';
import { generateDocuments } from './generate.ts';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const route = (staticData: string) => `
  import { createFileRoute } from '@tanstack/react-router';
  export const Route = createFileRoute('/_auth/admin/users')({ staticData: ${staticData} });`;

describe('permission route AST extractor', () => {
  it('accepts literals and controlled top-level const references', () => {
    const source = `import {createFileRoute as makeRoute} from '@tanstack/react-router';
      const PAGE='iam:user:view'; const ACTIONS=[{key:'create',code:'iam:user:create'}];
      export const Route=makeRoute('/_auth/admin/users')({staticData:{permission:PAGE,actions:ACTIONS}});`;
    expect(extractRouteSource('route.tsx', source).permissions.map(it => it.sourceKey)).toEqual([
      '/_auth/admin/users#page', '/_auth/admin/users#action:create',
    ]);
  });

  it.each([
    [`import {createFileRoute} from 'decoy'; export const Route=createFileRoute('/x')({});`, 'named import'],
    [`import {createFileRoute} from '@tanstack/react-router'; const other=createFileRoute('/other')({}); export const Route=createFileRoute('/x')({});`, '额外'],
    [`import {createFileRoute} from '@tanstack/react-router'; export const Route=createFileRoute('/x')(options());`, '对象 literal'],
    [`import {createFileRoute} from '@tanstack/react-router'; export const Route=createFileRoute('/x')({}); export const Route=createFileRoute('/y')({});`, '只能 export const Route'],
    [`import {createFileRoute} from '@tanstack/react-router'; const permission='iam:user:view'; export const Route=createFileRoute('/x')({staticData:{permission}});`, '显式 property'],
    [`import {createFileRoute} from '@tanstack/react-router'; export const Route=createFileRoute('/x')({staticData:{['permission']:'iam:user:view'}});`, '动态 property'],
    [`import {createFileRoute} from '@tanstack/react-router'; export const Route=createFileRoute('/x')({staticData:{permission(){return 'iam:user:view'}}});`, '显式 property'],
    [`import {createFileRoute} from '@tanstack/react-router'; const component=()=>null; export const Route=createFileRoute('/x')({component});`, 'route options 只允许显式'],
    [`import {createFileRoute} from '@tanstack/react-router'; export const Route=createFileRoute('/x')({['component']:()=>null});`, '动态 property'],
    [`import {createFileRoute} from '@tanstack/react-router'; export const Route=createFileRoute('/x')({...options});`, 'route options 只允许显式'],
    [`import {createFileRoute} from '@tanstack/react-router'; export const Route=createFileRoute('/x')({component(){return null}});`, 'route options 只允许显式'],
  ])('fails closed against route/extractor bypasses', (source, message) => {
    expect(() => extractRouteSource('route.tsx', source)).toThrow(message);
  });

  it.each([
    ["{permission: getCode()}", 'string literal'],
    ["{permission:'iam:user:view',actions:[{code:'iam:user:create'}]}", '稳定 key'],
    ["{permission:'dashboard:view'}", '三段'],
    ["{permission:'auth.permission.denied'}", '三段'],
    ["{permission:'iam:user:view',...dynamic}", '显式 property'],
  ])('rejects invalid or dynamic metadata: %s', (metadata, message) => {
    expect(() => extractRouteSource('route.tsx', route(metadata))).toThrow(message);
  });

  it('rejects duplicate source keys and duplicate action codes', () => {
    const one = extractRouteSource('a.tsx', route("{actions:[{key:'create',code:'iam:user:create'}]}"));
    expect(() => validateDeclarations([...one.permissions, ...one.permissions])).toThrow('重复 sourceKey');
    expect(() => validateDeclarations([
      ...one.permissions,
      { ...one.permissions[0]!, sourceKey: '/other#action:create' },
    ])).toThrow('重复 permission code');
  });

  it('generates deterministic byte-identical documents', async () => {
    expect(await generateDocuments()).toEqual(await generateDocuments());
  });

  it('keeps committed backend classpath artifacts byte-identical', async () => {
    const generated = await generateDocuments();
    const output = resolve(process.cwd(), '../backend/api-contract/src/main/resources/permissions');
    for (const [name, content] of Object.entries(generated)) {
      expect(await readFile(resolve(output, name), 'utf8')).toBe(content);
    }
  });
});
