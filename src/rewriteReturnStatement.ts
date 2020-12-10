import * as types from "@babel/types";
import { rewriteExpression } from "./rewriteExpression";
import { rewriteIfStatement } from "./rewriteIfStatement";
import { rewriteSequenceExpressionStatementGetLastValue } from "./rewriteSequenceExpression";
import { Scope } from "./scope";

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
