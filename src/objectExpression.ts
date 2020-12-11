import * as types from "@babel/types";
import { rewriteObjectProperty } from "./objectProperty";
import { rewriteObjectMethod } from "./objectMethod";
import { rewriteSpreadElement } from "./spreadElement";
import { Scope } from "./scope";

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
