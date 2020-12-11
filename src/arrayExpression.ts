import * as types from "@babel/types";
import { getIdentifiersExpressionUses, rewriteExpression } from "./expression";
import { IdentifierAccess } from "./IdentifierAccess";
import { PathNode } from "./path";
import { getIdentifiersSpreadElementUses } from "./spreadElement";

export function rewriteArrayExpression(
  expression: types.ArrayExpression,
  path: PathNode
): types.ArrayExpression {
  return types.arrayExpression(
    expression.elements.map((element) => {
      if (element == null) {
        return null;
      } else if (element.type === "SpreadElement") {
        return element;
      } else {
        return rewriteExpression(element, path);
      }
    })
  );
}

export function getIdentifiersArrayExpressionUses(
  expression: types.ArrayExpression
): IdentifierAccess[] {
  // some elements in array expressions can be null; filter them out
  let identifiers: IdentifierAccess[] = [];
  for (let element of expression.elements) {
    if (element == null) {
      continue;
    }

    if (types.isExpression(element)) {
      identifiers.push(...getIdentifiersExpressionUses(element));
    } else if (types.isSpreadElement(element)) {
      identifiers.push(...getIdentifiersSpreadElementUses(element));
    } else {
      throw new Error("ArrayExpression cannot have element " + element);
    }
  }

  return identifiers;
}
