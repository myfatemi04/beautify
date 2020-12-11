import * as types from "@babel/types";
import { getIdentifiersExpressionUses, rewriteExpression } from "./expression";
import { IdentifierAccess } from "./IdentifierAccess";
import { PathNode } from "./path";

export function rewriteClassPrivateProperty(
  property: types.ClassPrivateProperty,
  path: PathNode
): types.ClassPrivateProperty {
  return types.classPrivateProperty(
    property.key,
    rewriteExpression(property.value, path),
    property.decorators,
    property.static
  );
}

export function rewriteClassProperty(
  property: types.ClassProperty,
  path: PathNode
): types.ClassProperty {
  return types.classProperty(
    property.key,
    rewriteExpression(property.value, path),
    property.typeAnnotation,
    property.decorators,
    property.computed,
    property.static
  );
}

export function getIdentifiersClassPropertyUses(
  property: types.ClassProperty | types.ClassPrivateProperty
): IdentifierAccess[] {
  let identifiers: IdentifierAccess[] = [];

  if (types.isIdentifier(property.key)) {
    identifiers.push({ type: "define", id: property.key });
  } else if (types.isPrivateName(property.key)) {
    identifiers.push({ type: "define", id: property.key.id });
  } else {
    identifiers.push(...getIdentifiersExpressionUses(property.key));
  }

  identifiers.push(...getIdentifiersExpressionUses(property.value));

  return identifiers;
}
