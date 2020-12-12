import * as types from "@babel/types";
import { getIdentifiersExpressionUses, rewriteExpression } from "./expression";
import {
  concat,
  createIdentifierAccess,
  IdentifierAccess_,
} from "./IdentifierAccess";
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
): IdentifierAccess_ {
  let identifiers: IdentifierAccess_ = createIdentifierAccess();

  if (types.isIdentifier(property.key)) {
    identifiers.set.add(property.key.name);
  } else if (types.isPrivateName(property.key)) {
    identifiers.set.add(property.key.id.name);
  } else {
    identifiers = concat(
      identifiers,
      getIdentifiersExpressionUses(property.key)
    );
  }

  identifiers = concat(
    identifiers,
    getIdentifiersExpressionUses(property.value)
  );

  return identifiers;
}
