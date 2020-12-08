import * as types from "@babel/types";
import { getIdentifiersFunctionParamsUse } from "./getIdentifiersFunctionParamsUse";
import { getIdentifiersStatementUses } from "./getIdentifiersStatementUses";
import { IdentifierAccess } from "./IdentifierAccess";

export function getIdentifiersCatchClauseUses(
  statement: types.CatchClause
): IdentifierAccess[] {
  let identifiers: IdentifierAccess[] = [];

  identifiers.push(...getIdentifiersFunctionParamsUse([statement.param]));
  identifiers.push(...getIdentifiersStatementUses(statement.body));

  return identifiers;
}