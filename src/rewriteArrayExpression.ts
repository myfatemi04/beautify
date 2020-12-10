import * as types from "@babel/types";
import { rewriteExpression } from "./rewriteExpression";
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
