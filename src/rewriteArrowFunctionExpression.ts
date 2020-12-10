import * as types from "@babel/types";
import { rewriteExpression } from "./rewriteExpression";
import { rewriteStatementWrapWithBlock } from "./rewriteStatement";
import { Scope } from "./scope";

/**
 * Rewrites the body of an arrow function
 * Wraps the body with a block if it's not an expression
 *
 * @param expression (a) => { b() } or (a) => (b)
 * @param scope Scope
 */
export function rewriteArrowFunctionExpression(
  expression: types.ArrowFunctionExpression,
  scope: Scope
): types.ArrowFunctionExpression {
  if (types.isExpression(expression.body)) {
    return types.arrowFunctionExpression(
      expression.params,
      rewriteExpression(expression.body, scope)
    );
  } else {
    return types.arrowFunctionExpression(
      expression.params,
      rewriteStatementWrapWithBlock(expression.body, scope)
    );
  }
}
