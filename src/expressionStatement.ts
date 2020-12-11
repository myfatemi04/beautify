import * as types from "@babel/types";
import { rewriteConditionalExpressionStatement } from "./conditionalExpression";
import { rewriteExpression } from "./expression";
import { rewriteLogicalExpressionStatement } from "./logicalExpression";
import { rewriteSequenceExpressionStatement } from "./sequenceExpression";
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
