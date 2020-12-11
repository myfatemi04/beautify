import * as types from "@babel/types";
import { rewriteConditionalExpressionStatement } from "./conditionalExpression";
import { rewriteExpression } from "./expression";
import { rewriteLogicalExpressionStatement } from "./logicalExpression";
import { rewriteSequenceExpressionStatement } from "./sequenceExpression";
import { PathNode } from "./path";

export function rewriteExpressionStatement(
  statement: types.ExpressionStatement,
  path: PathNode
): types.Statement[] {
  let expression = statement.expression;

  switch (expression.type) {
    case "ConditionalExpression":
      return rewriteConditionalExpressionStatement(expression, path);
    case "LogicalExpression":
      return rewriteLogicalExpressionStatement(expression, path);
    case "SequenceExpression":
      return rewriteSequenceExpressionStatement(expression, path);

    default:
      return [types.expressionStatement(rewriteExpression(expression, path))];
  }
}
