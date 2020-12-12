import * as types from "@babel/types";
import { rewriteBlockStatement } from "./blockStatement";
import {
  getIdentifiersCatchClauseUses,
  rewriteCatchClause,
} from "./catchClause";
import {
  concat,
  createIdentifierAccess,
  IdentifierAccess_,
} from "./IdentifierAccess";
import { PathNode } from "./path";
import { getIdentifiersStatementUses } from "./statement";

/**
 * Rewrites the body of a try statement
 * Also rewrites the catch statement and finalizer if they exist
 *
 * @param statement try {} catch (e) {} finally {}
 * @param path path
 */
export function rewriteTryStatement(
  statement: types.TryStatement,
  path: PathNode
): types.TryStatement {
  let block = rewriteBlockStatement(statement.block, path);
  let handler = statement.handler
    ? rewriteCatchClause(statement.handler, path)
    : undefined;

  let finalizer = statement.finalizer
    ? rewriteBlockStatement(statement.finalizer, path)
    : undefined;

  return types.tryStatement(block, handler, finalizer);
}

export function getIdentifiersTryStatementUses(
  statement: types.TryStatement
): IdentifierAccess_ {
  let identifiers = createIdentifierAccess();

  identifiers = concat(
    identifiers,
    getIdentifiersStatementUses(statement.block)
  );

  if (statement.handler) {
    identifiers = concat(
      identifiers,
      getIdentifiersCatchClauseUses(statement.handler)
    );
  }

  if (statement.finalizer) {
    identifiers = concat(
      identifiers,
      getIdentifiersStatementUses(statement.finalizer)
    );
  }

  return identifiers;
}
