import * as types from "@babel/types";
import { rewriteBlockStatement } from "./blockStatement";
import {
  getIdentifiersCatchClauseUses,
  rewriteCatchClause,
} from "./catchClause";
import { IdentifierAccess } from "./IdentifierAccess";
import { Scope } from "./scope";
import { getIdentifiersStatementUses } from "./statement";

/**
 * Rewrites the body of a try statement
 * Also rewrites the catch statement and finalizer if they exist
 *
 * @param statement try {} catch (e) {} finally {}
 * @param scope Scope
 */
export function rewriteTryStatement(
  statement: types.TryStatement,
  scope: Scope
): types.TryStatement {
  let block = rewriteBlockStatement(statement.block, scope);
  let handler = statement.handler
    ? rewriteCatchClause(statement.handler, scope)
    : undefined;

  let finalizer = statement.finalizer
    ? rewriteBlockStatement(statement.finalizer, scope)
    : undefined;

  return types.tryStatement(block, handler, finalizer);
}

export function getIdentifiersTryStatementUses(
  statement: types.TryStatement
): IdentifierAccess[] {
  let identifiers = [];

  identifiers.push(...getIdentifiersStatementUses(statement.block));

  if (statement.handler) {
    identifiers.push(...getIdentifiersCatchClauseUses(statement.handler));
  }

  if (statement.finalizer) {
    identifiers.push(...getIdentifiersStatementUses(statement.finalizer));
  }

  return identifiers;
}
