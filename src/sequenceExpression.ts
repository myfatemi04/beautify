import * as types from "@babel/types";
import { rewriteExpression } from "./expression";
import { rewriteExpressionStatement } from "./expressionStatement";
import { Scope } from "./scope";

export function rewriteSequenceExpressionStatement(
  sequence: types.SequenceExpression,
  scope: Scope
): types.ExpressionStatement[] {
  return sequence.expressions.map((expression) =>
    types.expressionStatement(rewriteExpression(expression, scope))
  );
}

export function rewriteSequenceExpressionStatementGetLastValue(
  sequence: types.SequenceExpression,
  scope: Scope
): { value: types.Expression; preceeding: types.ExpressionStatement[] } {
  if (sequence.expressions.length === 0) {
    return { value: sequence, preceeding: [] };
  }
  let preceeding = sequence.expressions.slice(
    0,
    sequence.expressions.length - 1
  );
  let last = sequence.expressions[sequence.expressions.length - 1];
  return {
    value: rewriteExpression(last, scope),
    preceeding: [].concat(
      ...preceeding.map((expression) => {
        return rewriteExpressionStatement(
          types.expressionStatement(expression),
          scope
        );
      })
    ),
  };
}

export function rewriteSequenceExpression(
  sequence: types.SequenceExpression,
  scope: Scope
): types.SequenceExpression {
  return types.sequenceExpression(
    sequence.expressions.map((expression) =>
      rewriteExpression(expression, scope)
    )
  );
}
