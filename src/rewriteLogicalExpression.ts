import * as types from "@babel/types";
import negateExpression from "./negateExpression";
import { rewriteExpression } from "./rewriteExpression";
import { rewriteIfStatement } from "./rewriteIfStatement";
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

export function rewriteLogicalExpressionStatement(
  expression: types.LogicalExpression,
  scope: Scope
): types.Statement[] {
  if (expression.operator == "&&") {
    return rewriteIfStatement(
      types.ifStatement(
        expression.left,
        types.expressionStatement(expression.right),
        undefined
      ),
      scope
    );
  } else if (expression.operator === "||") {
    return rewriteIfStatement(
      types.ifStatement(
        negateExpression(expression.left),
        types.expressionStatement(expression.right),
        undefined
      ),
      scope
    );
  } else {
    expression.operator === "??";
    return rewriteIfStatement(
      types.ifStatement(
        types.binaryExpression(
          "!=",
          rewriteExpression(expression.left, scope),
          types.nullLiteral()
        ),
        types.expressionStatement(expression.right),
        undefined
      ),
      scope
    );
  }
}

export function rewriteLogicalExpression(
  expression: types.LogicalExpression,
  scope: Scope
): types.LogicalExpression {
  return types.logicalExpression(
    expression.operator,
    rewriteExpression(expression.left, scope),
    rewriteExpression(expression.right, scope)
  );
}
