import * as types from "@babel/types";
import { rewriteExpression } from "./expression";
import { rewriteIfStatement } from "./ifStatement";
import { PathNode } from "./path";

/**
 * If the value of the expression is not used, it is written as an if statement.
 *
 * @param expression Expression (a ? b : c)
 * @param path path
 */
export function rewriteConditionalExpressionStatement(
  expression: types.ConditionalExpression,
  path: PathNode
): types.Statement[] {
  return rewriteIfStatement(
    types.ifStatement(
      rewriteExpression(expression.test, path),
      types.expressionStatement(expression.consequent),
      types.expressionStatement(expression.alternate)
    ),
    path
  );
}

/**
 * Rewrites the individual elements of a conditional expression.
 * @param expression Conditional expression ( a ? b : c )
 * @param path path
 */
export function rewriteConditionalExpression(
  expression: types.ConditionalExpression,
  path: PathNode
): types.ConditionalExpression {
  let { test, consequent, alternate } = expression;

  let testRewritten = rewriteExpression(test, path);
  let consequentRewritten = rewriteExpression(consequent, path);
  let alternateRewritten = rewriteExpression(alternate, path);

  return types.conditionalExpression(
    testRewritten,
    consequentRewritten,
    alternateRewritten
  );
}
