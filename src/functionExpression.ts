import * as types from "@babel/types";
import { Scope } from "./scope";
import { rewriteScopedStatementArray } from "./statementArray";

/**
 * Rewrites the body of a function expression and converts
 * to an arrow expression.
 * @param expression a = function(b) {}
 * @param scope Scope
 */
export function rewriteFunctionExpression(
  expression: types.FunctionExpression,
  scope: Scope
): types.ArrowFunctionExpression {
  // Rewrite as arrow expression
  return types.arrowFunctionExpression(
    expression.params,
    types.blockStatement(
      rewriteScopedStatementArray(expression.body.body, scope)
    )
  );
}
