import * as types from "@babel/types";
import { createIfStatement } from "./createIfStatement";
import negateExpression from "./negateExpression";
import Preambleable from "./Preambleable";
import { rewriteExpressionsAndReduce } from "./rewriteExpression";
import { Scope } from "./scope";

/**
 * Rewrites statements like A && B() to something nicer, like
 * if (A) {
 * 	B()
 * }
 *
 * @param expression Logical expression (A && B ...)
 * @param scope Scope
 */

export function rewriteLogicalExpressionAsIfStatement(
  expression: types.LogicalExpression,
  scope: Scope
): Preambleable<types.IfStatement> {
  if (expression.operator == "&&") {
    return createIfStatement(
      expression.left,
      types.expressionStatement(expression.right),
      undefined,
      scope
    );
  } else if (expression.operator === "||") {
    return createIfStatement(
      negateExpression(expression.left),
      types.expressionStatement(expression.right),
      undefined,
      scope
    );
  } else {
    expression.operator === "??";
    return createIfStatement(
      types.binaryExpression("!=", expression.left, types.nullLiteral()),
      types.expressionStatement(expression.right),
      undefined,
      scope
    );
  }
}

export function rewriteLogicalExpression(
  expression: types.LogicalExpression,
  scope: Scope
): Preambleable<types.LogicalExpression> {
  let [preamble, [left, right]] = rewriteExpressionsAndReduce(
    scope,
    expression.left,
    expression.right
  );
  return {
    preamble,
    value: types.logicalExpression(expression.operator, left, right),
  };
}
