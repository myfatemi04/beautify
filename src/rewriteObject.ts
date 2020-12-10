import * as types from "@babel/types";
import { rewriteExpression } from "./rewriteExpression";
import { rewriteSpreadElement } from "./rewriteSpreadElement";
import { rewriteScopedStatementArray } from "./rewriteStatementArray";
import { Scope } from "./scope";

export function rewriteObjectMethod(
  objectMethod: types.ObjectMethod,
  scope: Scope
): types.ObjectMethod {
  let body = rewriteScopedStatementArray(objectMethod.body.body, scope);
  return types.objectMethod(
    objectMethod.kind,
    objectMethod.key,
    objectMethod.params,
    types.blockStatement(body)
  );
}

export function rewriteObjectProperty(
  property: types.ObjectProperty,
  scope: Scope
): types.ObjectProperty {
  let key = property.key;
  if (!property.computed) {
    key = rewriteExpression(key, scope);
  }
  let value = property.value;
  if (types.isExpression(value)) {
    value = rewriteExpression(value, scope);
  } else if (types.isRestElement(value)) {
  }
  return types.objectProperty(key, value);
}

export function rewriteObjectExpression(
  expression: types.ObjectExpression,
  scope: Scope
): types.ObjectExpression {
  let properties: Array<
    types.ObjectMethod | types.ObjectProperty | types.SpreadElement
  > = [];

  for (let property of expression.properties) {
    if (property.type === "SpreadElement") {
      properties.push(rewriteSpreadElement(property, scope));
    } else if (property.type === "ObjectMethod") {
      properties.push(rewriteObjectMethod(property, scope));
    } else if (property.type === "ObjectProperty") {
      properties.push(rewriteObjectProperty(property, scope));
    }
  }

  return types.objectExpression(properties);
}
