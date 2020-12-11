import * as types from "@babel/types";
import { getIdentifiersExpressionUses, rewriteExpression } from "./expression";
import { rewriteExpressionStatement } from "./expressionStatement";
import { IdentifierAccess } from "./IdentifierAccess";
import { PathNode } from "./path";

export function rewriteSequenceExpressionStatement(
  sequence: types.SequenceExpression,
  path: PathNode
): types.ExpressionStatement[] {
  return sequence.expressions.map((expression) =>
    types.expressionStatement(rewriteExpression(expression, path))
  );
}

export function rewriteSequenceExpressionStatementGetLastValue(
  sequence: types.SequenceExpression,
  path: PathNode
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
    value: rewriteExpression(last, path),
    preceeding: [].concat(
      ...preceeding.map((expression) => {
        return rewriteExpressionStatement(
          types.expressionStatement(expression),
          path
        );
      })
    ),
  };
}

export function rewriteSequenceExpression(
  sequence: types.SequenceExpression,
  path: PathNode
): types.SequenceExpression {
  return types.sequenceExpression(
    sequence.expressions.map((expression) =>
      rewriteExpression(expression, path)
    )
  );
}

export function getIdentifiersSequenceExpressionUses(
  expression: types.SequenceExpression
): IdentifierAccess[] {
  let identifiers: IdentifierAccess[] = [];
  for (let expression_ of expression.expressions) {
    identifiers.push(...getIdentifiersExpressionUses(expression_));
  }

  return identifiers;
}
