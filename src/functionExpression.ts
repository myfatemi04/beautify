import * as types from "@babel/types";
import { PathNode } from "./path";

/**
 * Rewrites the body of a function expression and converts
 * to an arrow expression.
 * @param expression a = function(b) {}
 * @param path path
 */
export function rewriteFunctionExpression(
  expression: types.FunctionExpression,
  path: PathNode
): types.ArrowFunctionExpression {
  let rewriter = new PathNode(expression.body.body, true, path);
  rewriter.rewrite();

  // Rewrite as arrow expression
  return types.arrowFunctionExpression(
    expression.params,
    types.blockStatement(rewriter.body)
  );
}
