import * as types from "@babel/types";
import Preambleable from "./Preambleable";
import { rewriteExpression, rewriteExpressionsAndConcat } from "./rewriteExpression";
import { Scope } from "./scope";

/**
 * Writes the callee (A) and the arguments (B, C)
 * @param expression Call expression: A(B, C)
 * @param scope Scope
 */
export function rewriteCallExpression(
  expression: types.CallExpression,
  scope: Scope
): Preambleable<types.CallExpression> {
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
      args.push(rewriteExpressionsAndConcat(arg, scope, preamble));
    }
  }

  let calleeExpression = expression.callee;
  if (expression.callee.type !== "V8IntrinsicIdentifier") {
    let rewrittenCallee = rewriteExpression(expression.callee, scope);
    preamble = preamble.concat(rewrittenCallee.preamble);
    calleeExpression = rewrittenCallee.value;
  }

  return {
    preamble,
    value: types.callExpression(calleeExpression, args),
  };
}
