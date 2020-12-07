import * as types from "@babel/types";
import { rewriteScopedStatementArray } from "./rewriteStatementArray";
import { Scope } from "./scope";

export function rewriteFunctionDeclaration(
  declaration: types.FunctionDeclaration,
  scope: Scope
): types.FunctionDeclaration {
  return types.functionDeclaration(
    declaration.id,
    declaration.params,
    types.blockStatement(
      rewriteScopedStatementArray(declaration.body.body, scope)
    )
  );
}

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
