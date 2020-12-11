import * as types from "@babel/types";
import { getIdentifiersExpressionsUse, rewriteExpression } from "./expression";
import { IdentifierAccess } from "./IdentifierAccess";
import { Scope } from "./scope";

export function rewriteArrayExpression(
  expression: types.ArrayExpression,
  scope: Scope
): types.ArrayExpression {
  return types.arrayExpression(
    expression.elements.map((element) => {
      if (element == null) {
        return null;
      } else if (element.type === "SpreadElement") {
        return element;
      } else {
        return rewriteExpression(element, scope);
      }
    })
  );
}

export function getIdentifiersArrayExpressionUses(
  expression: types.ArrayExpression
): IdentifierAccess[] {
  // some elements in array expressions can be null; filter them out
  return getIdentifiersExpressionsUse(
    expression.elements.filter((element) => element != null)
  );
}
