import * as types from "@babel/types";
import negateExpression from "./negateExpression";
import { rewriteExpression } from "./expression";
import { rewriteIfStatement } from "./ifStatement";
import { PathNode } from "./path";

/**
 * Rewrites statements like A && B() to something nicer, like
 * if (A) {
 * 	B()
 * }
 *
 * @param expression Logical expression (A && B ...)
 * @param path path
 */

export function rewriteLogicalExpressionStatement(
  expression: types.LogicalExpression,
  path: PathNode
): types.Statement[] {
  if (expression.operator == "&&") {
    return rewriteIfStatement(
      types.ifStatement(
        expression.left,
        types.expressionStatement(expression.right),
        undefined
      ),
      path
    );
  } else if (expression.operator === "||") {
    return rewriteIfStatement(
      types.ifStatement(
        negateExpression(expression.left),
        types.expressionStatement(expression.right),
        undefined
      ),
      path
    );
  } else {
    expression.operator === "??";
    return rewriteIfStatement(
      types.ifStatement(
        types.binaryExpression(
          "!=",
          rewriteExpression(expression.left, path),
          types.nullLiteral()
        ),
        types.expressionStatement(expression.right),
        undefined
      ),
      path
    );
  }
}

export function rewriteLogicalExpression(
  expression: types.LogicalExpression,
  path: PathNode
): types.LogicalExpression {
  return types.logicalExpression(
    expression.operator,
    rewriteExpression(expression.left, path),
    rewriteExpression(expression.right, path)
  );
}
