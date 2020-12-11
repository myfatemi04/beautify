import * as types from "@babel/types";
import {
  getIdentifiersObjectPropertyUses,
  rewriteObjectProperty,
} from "./objectProperty";
import { rewriteObjectMethod } from "./objectMethod";
import {
  getIdentifiersSpreadElementUses,
  rewriteSpreadElement,
} from "./spreadElement";
import { Scope } from "./scope";
import { combine } from "./combine";
import { getIdentifiersExpressionUses } from "./expression";
import { IdentifierAccess } from "./IdentifierAccess";

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

export function getIdentifiersObjectExpressionUses(
  expression: types.ObjectExpression
): IdentifierAccess[] {
  let identifiers: IdentifierAccess[] = [];
  for (let property of expression.properties) {
    if (property.type === "SpreadElement") {
      identifiers.push(...getIdentifiersSpreadElementUses(property));
    } else if (property.type === "ObjectProperty") {
      identifiers.push(...getIdentifiersObjectPropertyUses(property));
    }
  }
  return identifiers;
}
