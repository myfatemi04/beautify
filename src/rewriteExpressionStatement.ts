import * as types from "@babel/types";
import { rewriteConditionalExpressionStatement } from "./rewriteConditionalExpression";
import { rewriteExpression } from "./rewriteExpression";
import { rewriteLogicalExpressionStatement } from "./rewriteLogicalExpression";
import { rewriteSequenceExpressionStatement } from "./rewriteSequenceExpression";
import { Scope } from "./scope";

export function rewriteExpressionStatement(
  statement: types.ExpressionStatement,
  scope: Scope
): types.Statement[] {
  let expression = statement.expression;

  switch (expression.type) {
    case "ConditionalExpression":
      return rewriteConditionalExpressionStatement(expression, scope);
    case "LogicalExpression":
      return rewriteLogicalExpressionStatement(expression, scope);
    case "SequenceExpression":
      return rewriteSequenceExpressionStatement(expression, scope);

    default:
      return [types.expressionStatement(rewriteExpression(expression, scope))];
  }
}
