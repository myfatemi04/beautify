import * as types from "@babel/types";
import { rewriteBlockStatement } from "./blockStatement";
import { rewriteCatchClause } from "./catchClause";
import { Scope } from "./scope";

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
