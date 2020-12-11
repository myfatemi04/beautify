import * as types from "@babel/types";
import { getIdentifiersExpressionUses, rewriteExpression } from "./expression";
import { rewriteIfStatement } from "./ifStatement";
import { rewriteSequenceExpressionStatementGetLastValue } from "./sequenceExpression";
import { Scope } from "./scope";
import { IdentifierAccess } from "./IdentifierAccess";

/**
 * Rewrites the argument of a return statement.
 * If the argument is a conditional (a ? b : c), converts the return statement
 * to an if statement.
 *
 * @param statement return x;
 * @param scope Scope
 */
export function rewriteReturnStatement(
  statement: types.ReturnStatement,
  scope: Scope
): types.Statement[] {
  if (!statement.argument) {
    return [statement];
  } else {
    if (statement.argument.type === "ConditionalExpression") {
      let { test, consequent, alternate } = statement.argument;

      return rewriteIfStatement(
        types.ifStatement(
          test,
          types.returnStatement(consequent),
          types.returnStatement(alternate)
        ),
        scope
      );
    }

    if (statement.argument.type === "SequenceExpression") {
      let rewritten = rewriteSequenceExpressionStatementGetLastValue(
        statement.argument,
        scope
      );

      return [...rewritten.preceeding, types.returnStatement(rewritten.value)];
    }

    return [
      types.returnStatement(rewriteExpression(statement.argument, scope)),
    ];
  }
}

export function getIdentifiersReturnStatementUses(
  statement: types.ReturnStatement
): IdentifierAccess[] {
  if (statement.argument) {
    return getIdentifiersExpressionUses(statement.argument);
  } else {
    return [];
  }
}
