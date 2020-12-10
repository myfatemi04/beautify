import * as types from "@babel/types";
import { rewriteExpression } from "./rewriteExpression";
import { Scope } from "./scope";

/**
 * Writes the callee (A) and the arguments (B, C)
 * @param expression Call expression: A(B, C)
 * @param scope Scope
 */
export function rewriteCallExpression(
  expression: types.CallExpression,
  scope: Scope
): types.CallExpression {
  let preamble = [];
  let args = [];
  for (let arg of expression.arguments) {
    if (
      arg.type === "SpreadElement" ||
      arg.type === "JSXNamespacedName" ||
      arg.type === "ArgumentPlaceholder"
    ) {
      args.push(arg);
    } else {
      args.push(rewriteExpression(arg, scope));
    }
  }

  let calleeExpression = expression.callee;
  if (expression.callee.type !== "V8IntrinsicIdentifier") {
    calleeExpression = rewriteExpression(expression.callee, scope);
  }

  return types.callExpression(calleeExpression, args);
}
