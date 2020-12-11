import * as types from "@babel/types";
import { rewriteExpression } from "./expression";
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
