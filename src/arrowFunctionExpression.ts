import * as types from "@babel/types";
import { rewriteExpression } from "./expression";
import { PathNode } from "./path";
import { rewriteBlockStatement } from "./blockStatement";

/**
 * Rewrites the body of an arrow function
 * Wraps the body with a block if it's not an expression
 *
 * @param expression (a) => { b() } or (a) => (b)
 * @param path path
 */
export function rewriteArrowFunctionExpression(
  expression: types.ArrowFunctionExpression,
  path: PathNode
): types.ArrowFunctionExpression {
  if (types.isExpression(expression.body)) {
    return types.arrowFunctionExpression(
      expression.params,
      rewriteExpression(expression.body, path)
    );
  } else {
    return types.arrowFunctionExpression(
      expression.params,
      rewriteBlockStatement(expression.body, path)
    );
  }
}
