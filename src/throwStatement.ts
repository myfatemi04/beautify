import * as types from "@babel/types";
import { getIdentifiersExpressionUses, rewriteExpression } from "./expression";
import { IdentifierAccess_ } from "./IdentifierAccess";
import { PathNode } from "./path";

/**
 * Rewrites a throw statement: the expression to be thrown.
 * If the expression needs additional setup, split it up.
 *
 * @param statement
 * @param path
 */
export function rewriteThrowStatement(
  statement: types.ThrowStatement,
  path: PathNode
): types.ThrowStatement {
  return types.throwStatement(rewriteExpression(statement.argument, path));
}

export function getIdentifiersThrowStatementUses(
  statement: types.ThrowStatement
): IdentifierAccess_ {
  return getIdentifiersExpressionUses(statement.argument);
}
