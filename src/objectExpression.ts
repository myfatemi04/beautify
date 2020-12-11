import * as types from "@babel/types";
import {
  getIdentifiersObjectPropertyUses,
  rewriteObjectProperty,
} from "./objectProperty";
import {
  getIdentifiersObjectMethodUses,
  rewriteObjectMethod,
} from "./objectMethod";
import {
  getIdentifiersSpreadElementUses,
  rewriteSpreadElement,
} from "./spreadElement";
import { PathNode } from "./path";
import { IdentifierAccess } from "./IdentifierAccess";

export function rewriteObjectExpression(
  expression: types.ObjectExpression,
  path: PathNode
): types.ObjectExpression {
  let properties: Array<
    types.ObjectMethod | types.ObjectProperty | types.SpreadElement
  > = [];

  for (let property of expression.properties) {
    if (property.type === "SpreadElement") {
      properties.push(rewriteSpreadElement(property, path));
    } else if (property.type === "ObjectMethod") {
      properties.push(rewriteObjectMethod(property, path));
    } else if (property.type === "ObjectProperty") {
      properties.push(rewriteObjectProperty(property, path));
    }
  }

  return types.objectExpression(properties);
}

export function getIdentifiersObjectExpressionUses(
  expression: types.ObjectExpression
): IdentifierAccess[] {
  let identifiers: IdentifierAccess[] = [];
  for (let property of expression.properties) {
    if (types.isSpreadElement(property)) {
      identifiers.push(...getIdentifiersSpreadElementUses(property));
    } else if (types.isObjectProperty(property)) {
      identifiers.push(...getIdentifiersObjectPropertyUses(property));
    } else if (types.isObjectMethod(property)) {
      identifiers.push(...getIdentifiersObjectMethodUses(property));
    } else {
      throw new Error("Invalid object expression property " + property);
    }
  }
  return identifiers;
}
