import * as types from "@babel/types";
import { createIfStatement } from "./createIfStatement";
import Preambleable from "./Preambleable";
import { rewriteExpression } from "./rewriteExpression";
import { Scope } from "./scope";

/**
 * If the value of the expression is not used, it is written as an if statement.
 * 
 * @param expression Expression (a ? b : c)
 * @param scope Scope
 */
export function beautifyConditionalExpressionStatement(
  expression: types.ConditionalExpression,
  scope: Scope
): Preambleable<types.IfStatement> {
  return createIfStatement(
    expression.test,
    types.expressionStatement(expression.consequent),
    types.expressionStatement(expression.alternate),
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
): Preambleable<types.ConditionalExpression> {
  let { test, consequent, alternate } = expression;

  let testRewritten = rewriteExpression(test, scope);
  let consequentRewritten = rewriteExpression(consequent, scope);
  let alternateRewritten = rewriteExpression(alternate, scope);

  let preamble = [].concat(
    testRewritten.preamble,
    consequentRewritten.preamble,
    alternateRewritten.preamble
  );

  return {
    preamble,
    value: types.conditionalExpression(
      testRewritten.value,
      consequentRewritten.value,
      alternateRewritten.value
    ),
  };
}