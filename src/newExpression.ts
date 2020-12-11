import * as types from "@babel/types";
import { rewriteExpression } from "./expression";
import { PathNode } from "./path";

/**
 * When given new A(B), write A and B, in that order.
 */
export function rewriteNewExpression(
  expression: types.NewExpression,
  path: PathNode
): types.NewExpression {
  let callee = expression.callee;
  if (callee.type !== "V8IntrinsicIdentifier") {
    callee = rewriteExpression(callee, path);
  }

  return types.newExpression(callee, expression.arguments);
}
