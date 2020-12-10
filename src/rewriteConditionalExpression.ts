import * as types from "@babel/types";
import { rewriteExpression } from "./rewriteExpression";
import { rewriteIfStatement } from "./rewriteIfStatement";
import { Scope } from "./scope";

/**
 * If the value of the expression is not used, it is written as an if statement.
 *
 * @param expression Expression (a ? b : c)
 * @param scope Scope
 */
export function rewriteConditionalExpressionStatement(
  expression: types.ConditionalExpression,
  scope: Scope
): types.Statement[] {
  return rewriteIfStatement(
    types.ifStatement(
      rewriteExpression(expression.test, scope),
      types.expressionStatement(expression.consequent),
      types.expressionStatement(expression.alternate)
    ),
    scope
  );
}

/**
 * Rewrites the individual elements of a conditional expression.
 * @param expression Conditional expression ( a ? b : c )
 * @param scope Scope
 */
export function rewriteConditionalExpression(
  expression: types.ConditionalExpression,
  scope: Scope
): types.ConditionalExpression {
  let { test, consequent, alternate } = expression;

  let testRewritten = rewriteExpression(test, scope);
  let consequentRewritten = rewriteExpression(consequent, scope);
  let alternateRewritten = rewriteExpression(alternate, scope);

  return types.conditionalExpression(
    testRewritten,
    consequentRewritten,
    alternateRewritten
  );
}
