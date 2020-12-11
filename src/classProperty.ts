import * as types from "@babel/types";
import { rewriteExpression } from "./expression";
import { Scope } from "./scope";

export function rewriteClassPrivateProperty(
  property: types.ClassPrivateProperty,
  scope: Scope
): types.ClassPrivateProperty {
  return types.classPrivateProperty(
    property.key,
    rewriteExpression(property.value, scope),
    property.decorators,
    property.static
  );
}

export function rewriteClassProperty(
  property: types.ClassProperty,
  scope: Scope
): types.ClassProperty {
  return types.classProperty(
    property.key,
    rewriteExpression(property.value, scope),
    property.typeAnnotation,
    property.decorators,
    property.computed,
    property.static
  );
}
