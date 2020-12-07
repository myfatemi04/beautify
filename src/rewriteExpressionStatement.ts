import * as types from "@babel/types";
import Preambleable from "./Preambleable";
import { beautifyConditionalExpressionStatement } from "./rewriteConditionalExpression";
import { rewriteExpression } from "./rewriteExpression";
import { rewriteLogicalExpressionAsIfStatement } from "./rewriteLogicalExpression";
import { rewriteSequenceExpressionStatement } from "./rewriteSequenceExpression";
import { Scope } from "./scope";

export function rewriteExpressionStatement(
  statement: types.ExpressionStatement,
  scope: Scope
): Preambleable<types.Statement> {
  let expression = statement.expression;
  switch (expression.type) {
    case "ConditionalExpression":
      return beautifyConditionalExpressionStatement(expression, scope);
    case "LogicalExpression":
      return rewriteLogicalExpressionAsIfStatement(expression, scope);
    case "SequenceExpression":
      return rewriteSequenceExpressionStatement(expression, scope);

    default: {
      let { preamble, value } = rewriteExpression(expression, scope);

      return {
        preamble,
        value: types.expressionStatement(value),
      };
    }
  }
}
