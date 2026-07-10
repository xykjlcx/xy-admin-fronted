import {
  ScriptKind,
  ScriptTarget,
  createSourceFile,
  forEachChild,
  isArrayLiteralExpression,
  isIdentifier,
  isObjectLiteralExpression,
  isPropertyAssignment,
  isStringLiteralLike,
  type Node,
  type ObjectLiteralExpression,
  type PropertyName,
  type StringLiteralLike,
} from 'typescript';

export type RoutePermissionViolation = {
  kind: 'page' | 'action';
  code: string;
  filePath: string;
  line: number;
  column: number;
};

const permissionGrammar = /^[a-z][a-z0-9-]*(:[a-z][a-z0-9-]*){2}$/;

function propertyNameText(name: PropertyName): string | undefined {
  if (isIdentifier(name) || isStringLiteralLike(name)) return name.text;
  return undefined;
}

function findProperty(object: ObjectLiteralExpression, name: string) {
  return object.properties.find(
    (property) => isPropertyAssignment(property) && propertyNameText(property.name) === name,
  );
}

export function collectRoutePermissionViolations(
  filePath: string,
  source: string,
): RoutePermissionViolation[] {
  const sourceFile = createSourceFile(
    filePath,
    source,
    ScriptTarget.Latest,
    true,
    filePath.endsWith('.tsx') ? ScriptKind.TSX : ScriptKind.TS,
  );
  const violations: RoutePermissionViolation[] = [];

  function validateLiteral(literal: StringLiteralLike, kind: 'page' | 'action') {
    if (permissionGrammar.test(literal.text)) return;
    const position = sourceFile.getLineAndCharacterOfPosition(literal.getStart(sourceFile));
    violations.push({
      kind,
      code: literal.text,
      filePath,
      line: position.line + 1,
      column: position.character + 1,
    });
  }

  function inspectStaticData(staticData: ObjectLiteralExpression) {
    const permission = findProperty(staticData, 'permission');
    if (permission && isPropertyAssignment(permission) && isStringLiteralLike(permission.initializer)) {
      validateLiteral(permission.initializer, 'page');
    }

    const actions = findProperty(staticData, 'actions');
    if (!actions || !isPropertyAssignment(actions) || !isArrayLiteralExpression(actions.initializer)) {
      return;
    }
    for (const action of actions.initializer.elements) {
      if (!isObjectLiteralExpression(action)) continue;
      const code = findProperty(action, 'code');
      if (code && isPropertyAssignment(code) && isStringLiteralLike(code.initializer)) {
        validateLiteral(code.initializer, 'action');
      }
    }
  }

  function visit(node: Node) {
    if (
      isPropertyAssignment(node) &&
      propertyNameText(node.name) === 'staticData' &&
      isObjectLiteralExpression(node.initializer)
    ) {
      inspectStaticData(node.initializer);
    }
    forEachChild(node, visit);
  }

  visit(sourceFile);
  return violations;
}
