import * as types from "@babel/types";
import { rewriteExpression } from "./expression";
import { PathNode } from "./path";

/**
 * Writes the callee (A) and the arguments (B, C)
 * @param expression Call expression: A(B, C)
 * @param path path
 */
export function rewriteCallExpression(
  expression: types.CallExpression,
  path: PathNode
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
      args.push(rewriteExpression(arg, path));
    }
  }

  let calleeExpression = expression.callee;
  if (expression.callee.type !== "V8IntrinsicIdentifier") {
    calleeExpression = rewriteExpression(expression.callee, path);
  }

  return types.callExpression(calleeExpression, args);
}
