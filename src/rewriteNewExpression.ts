import * as types from "@babel/types";
import Preambleable from "./Preambleable";
import { rewriteExpressionsAndConcat } from "./rewriteExpression";
import { Scope } from "./scope";

/**
 * When given new A(B), write A and B, in that order.
 */
export function rewriteNewExpression(
  expression: types.NewExpression,
  scope: Scope
): Preambleable<types.NewExpression> {
  let callee = expression.callee;
  let preamble: types.Statement[] = [];
  if (callee.type !== "V8IntrinsicIdentifier") {
    callee = rewriteExpressionsAndConcat(callee, scope, preamble);
  }

  return {
    preamble,
    value: types.newExpression(callee, expression.arguments),
  };
}
