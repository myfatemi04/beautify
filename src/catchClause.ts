import * as types from "@babel/types";
import { getIdentifiersFunctionParamsUse } from "./functionParams";
import { getIdentifiersStatementUses } from "./statement";
import { IdentifierAccess } from "./IdentifierAccess";
import { PathNode } from "./path";
import { rewriteBlockStatement } from "./blockStatement";

export function getIdentifiersCatchClauseUses(
  statement: types.CatchClause
): IdentifierAccess[] {
  let identifiers: IdentifierAccess[] = [];

  identifiers.push(...getIdentifiersFunctionParamsUse([statement.param]));
  identifiers.push(...getIdentifiersStatementUses(statement.body));

  return identifiers;
}

/**
 * Rewrites the body of a catch clause
 * @param clause catch (e) {}
 * @param path path
 */
export function rewriteCatchClause(
  clause: types.CatchClause,
  path: PathNode
): types.CatchClause {
  return types.catchClause(
    clause.param,
    rewriteBlockStatement(clause.body, path)
  );
}
