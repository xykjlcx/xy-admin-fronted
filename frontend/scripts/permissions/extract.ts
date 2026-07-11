import ts from 'typescript';

export type PermissionDeclaration = {
  sourceKey: string;
  code: string;
  kind: 'PAGE' | 'ACTION';
  routeId: string;
  labelKey?: string;
};

export type MenuDeclaration = {
  sourceKey: string;
  subsystemKey: string;
  routeKey: string | null;
  type: 'menu' | 'dir';
  path: string | null;
  labelKey: string;
  permission: string | null;
  parentSourceKey: string | null;
  icon: string | null;
  sort: number;
  visible: boolean;
};

export type PermissionReference = { routeId: string; code: string };
export type ExtractedCatalog = { routeId: string; permissions: PermissionDeclaration[]; menus: MenuDeclaration[]; references: PermissionReference[] };

const codePattern = /^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$/;
const keyPattern = /^[a-z][a-z0-9-]*$/;

function fail(file: ts.SourceFile, node: ts.Node, message: string): never {
  const position = file.getLineAndCharacterOfPosition(node.getStart(file));
  throw new Error(`${file.fileName}:${position.line + 1}:${position.character + 1} ${message}`);
}

function property(object: ts.ObjectLiteralExpression, name: string): ts.Expression | undefined {
  for (const item of object.properties) {
    if (!ts.isPropertyAssignment(item)) continue;
    const key = ts.isIdentifier(item.name) || ts.isStringLiteralLike(item.name) ? item.name.text : undefined;
    if (key === name) return item.initializer;
  }
  return undefined;
}

function assertPlainObject(file: ts.SourceFile, object: ts.ObjectLiteralExpression, name: string) {
  for (const item of object.properties) {
    if (!ts.isPropertyAssignment(item)) fail(file, item, `${name} 只允许显式 property assignment`);
    if (!ts.isIdentifier(item.name) && !ts.isStringLiteralLike(item.name)) fail(file, item.name, `${name} 禁止动态 property name`);
  }
}

function stringValue(file: ts.SourceFile, node: ts.Expression | undefined, name: string): string | undefined {
  if (!node) return undefined;
  if (!ts.isStringLiteralLike(node)) fail(file, node, `${name} 必须是 string literal`);
  return node.text;
}

function resolveControlled(
  file: ts.SourceFile,
  node: ts.Expression,
  constants: ReadonlyMap<string, ts.Expression>,
  seen = new Set<string>(),
): ts.Expression {
  if (!ts.isIdentifier(node)) return node;
  if (seen.has(node.text)) fail(file, node, `常量 ${node.text} 循环引用`);
  const value = constants.get(node.text);
  if (!value) fail(file, node, `只允许引用同文件顶层 const: ${node.text}`);
  seen.add(node.text);
  return resolveControlled(file, value, constants, seen);
}

function assertCode(file: ts.SourceFile, node: ts.Expression, code: string) {
  if (!codePattern.test(code)) fail(file, node, `非法权限码 ${code}，必须严格为三段 colon grammar`);
}

export function extractRouteSource(fileName: string, source: string): ExtractedCatalog {
  const file = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true,
    fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const constants = new Map<string, ts.Expression>();
  const routeFactories: string[] = [];
  for (const statement of file.statements) {
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier) &&
        statement.moduleSpecifier.text === '@tanstack/react-router') {
      const bindings = statement.importClause?.namedBindings;
      if (bindings && ts.isNamedImports(bindings)) {
        for (const binding of bindings.elements) {
          if ((binding.propertyName?.text ?? binding.name.text) === 'createFileRoute') routeFactories.push(binding.name.text);
        }
      }
    }
    if (!ts.isVariableStatement(statement) || !(statement.declarationList.flags & ts.NodeFlags.Const)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.initializer) constants.set(declaration.name.text, declaration.initializer);
    }
  }
  if (routeFactories.length !== 1) fail(file, file, '必须且只能 named import 一次 createFileRoute（允许 alias）');
  const factory = routeFactories[0]!;
  const routeDeclarations: ts.VariableDeclaration[] = [];
  for (const statement of file.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    const exported = statement.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword);
    for (const declaration of statement.declarationList.declarations) {
      if (exported && ts.isIdentifier(declaration.name) && declaration.name.text === 'Route') routeDeclarations.push(declaration);
    }
  }
  if (routeDeclarations.length !== 1) fail(file, file, '每个 route 文件必须且只能 export const Route 一次');
  const routeDeclaration = routeDeclarations[0]!;
  if (!routeDeclaration.initializer || !ts.isCallExpression(routeDeclaration.initializer)) fail(file, routeDeclaration, 'Route options 必须静态调用');
  const configured = routeDeclaration.initializer;
  if (!ts.isCallExpression(configured.expression) || !ts.isIdentifier(configured.expression.expression) || configured.expression.expression.text !== factory) {
    fail(file, configured, 'Route 必须由绑定的 createFileRoute 直接创建');
  }
  const routeFactoryCall = configured.expression;
  if (routeFactoryCall.arguments.length !== 1 || !ts.isStringLiteralLike(routeFactoryCall.arguments[0]!)) {
    fail(file, routeFactoryCall, 'createFileRoute routeId 必须是唯一 string literal');
  }
  const matchingCalls: ts.CallExpression[] = [];
  const collectCalls = (node: ts.Node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === factory) matchingCalls.push(node);
    ts.forEachChild(node, collectCalls);
  };
  collectCalls(file);
  if (matchingCalls.length !== 1 || matchingCalls[0] !== routeFactoryCall) fail(file, file, 'route 文件禁止额外 createFileRoute 调用');
  const routeId = routeFactoryCall.arguments[0].text;
  let staticData: ts.ObjectLiteralExpression | undefined;
  if (configured.arguments.length !== 1) fail(file, configured, 'Route options 必须且只能有一个参数');
  const options = resolveControlled(file, configured.arguments[0]!, constants);
  if (!ts.isObjectLiteralExpression(options)) fail(file, options, 'route options 必须是对象 literal');
  assertPlainObject(file, options, 'route options');
  const candidate = property(options, 'staticData');
  if (candidate) {
    const value = resolveControlled(file, candidate, constants);
    if (!ts.isObjectLiteralExpression(value)) fail(file, value, 'staticData 必须是受控对象 literal');
    assertPlainObject(file, value, 'staticData');
    staticData = value;
  }
  if (!staticData) return { routeId, permissions: [], menus: [], references: [] };

  const permissions: PermissionDeclaration[] = [];
  const references: PermissionReference[] = [];
  const pageNode = property(staticData, 'permission');
  const labelKey = stringValue(file, property(staticData, 'labelKey'), 'labelKey');
  if (pageNode) {
    const resolved = resolveControlled(file, pageNode, constants);
    const code = stringValue(file, resolved, 'permission')!;
    assertCode(file, resolved, code);
    permissions.push({ sourceKey: `${routeId}#page`, code, kind: 'PAGE', routeId, ...(labelKey ? { labelKey } : {}) });
  }
  const referenceNode = property(staticData, 'permissionRef');
  if (pageNode && referenceNode) fail(file, staticData, 'permission 与 permissionRef 不能同时出现');
  if (referenceNode) {
    const resolved = resolveControlled(file, referenceNode, constants);
    const code = stringValue(file, resolved, 'permissionRef')!;
    assertCode(file, resolved, code);
    references.push({ routeId, code });
  }

  const actionsNode = property(staticData, 'actions');
  if (actionsNode) {
    const resolvedActions = resolveControlled(file, actionsNode, constants);
    if (!ts.isArrayLiteralExpression(resolvedActions)) fail(file, resolvedActions, 'actions 必须是 array literal');
    for (const element of resolvedActions.elements) {
      const resolved = resolveControlled(file, element as ts.Expression, constants);
      if (!ts.isObjectLiteralExpression(resolved)) fail(file, resolved, 'action 必须是对象 literal');
      assertPlainObject(file, resolved, 'action');
      const keyNode = property(resolved, 'key');
      if (!keyNode) fail(file, resolved, 'action 缺少稳定 key');
      const keyExpression = resolveControlled(file, keyNode, constants);
      const key = stringValue(file, keyExpression, 'action key')!;
      if (!keyPattern.test(key)) fail(file, keyExpression, `非法 action key ${key}`);
      const codeNode = property(resolved, 'code');
      if (!codeNode) fail(file, resolved, 'action 缺少 code');
      const codeExpression = resolveControlled(file, codeNode, constants);
      const code = stringValue(file, codeExpression, 'action code')!;
      assertCode(file, codeExpression, code);
      const actionLabel = stringValue(file, property(resolved, 'labelKey'), 'action labelKey');
      permissions.push({ sourceKey: `${routeId}#action:${key}`, code, kind: 'ACTION', routeId,
        ...(actionLabel ? { labelKey: actionLabel } : {}) });
    }
  }

  return { routeId, permissions, menus: [], references };
}

export function validateDeclarations(declarations: PermissionDeclaration[]): void {
  const sources = new Set<string>();
  const codes = new Map<string, string>();
  for (const item of declarations) {
    if (sources.has(item.sourceKey)) throw new Error(`重复 sourceKey: ${item.sourceKey}`);
    sources.add(item.sourceKey);
    const owner = codes.get(item.code);
    if (owner && owner !== item.sourceKey) throw new Error(`重复 permission code: ${item.code} (${owner}, ${item.sourceKey})`);
    codes.set(item.code, item.sourceKey);
  }
}
