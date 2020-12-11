import * as types from "@babel/types";
import { getIdentifiersExpressionUses, rewriteExpression } from "./expression";
import { IdentifierAccess } from "./IdentifierAccess";
import { Scope } from "./scope";

/**
 * Rewrites a throw statement: the expression to be thrown.
 * If the expression needs additional setup, split it up.
 *
 * @param statement
 * @param scope
 */
export function rewriteThrowStatement(
  statement: types.ThrowStatement,
  scope: Scope
): types.ThrowStatement {
  return types.throwStatement(rewriteExpression(statement.argument, scope));
}

export function getIdentifiersThrowStatementUses(
  statement: types.ThrowStatement
): IdentifierAccess[] {
  return getIdentifiersExpressionUses(statement.argument);
}
