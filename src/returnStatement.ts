import * as types from "@babel/types";
import { getIdentifiersExpressionUses, rewriteExpression } from "./expression";
import { rewriteIfStatement } from "./ifStatement";
import { rewriteSequenceExpressionStatementGetLastValue } from "./sequenceExpression";
import { PathNode } from "./path";
import { createIdentifierAccess, IdentifierAccess_ } from "./IdentifierAccess";

/**
 * Rewrites the argument of a return statement.
 * If the argument is a conditional (a ? b : c), converts the return statement
 * to an if statement.
 *
 * @param statement return x;
 * @param path path
 */
export function rewriteReturnStatement(
  statement: types.ReturnStatement,
  path: PathNode
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
        path
      );
    }

    if (statement.argument.type === "SequenceExpression") {
      let rewritten = rewriteSequenceExpressionStatementGetLastValue(
        statement.argument,
        path
      );

      return [...rewritten.preceeding, types.returnStatement(rewritten.value)];
    }

    return [types.returnStatement(rewriteExpression(statement.argument, path))];
  }
}

export function getIdentifiersReturnStatementUses(
  statement: types.ReturnStatement
): IdentifierAccess_ {
  if (statement.argument) {
    return getIdentifiersExpressionUses(statement.argument);
  } else {
    return createIdentifierAccess();
  }
}
