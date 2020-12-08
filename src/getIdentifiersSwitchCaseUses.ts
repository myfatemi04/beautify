import * as types from "@babel/types";
import { getIdentifiersExpressionUses } from "./getIdentifiersExpressionUses";
import { getIdentifiersStatementsUse } from "./getIdentifiersStatementUses";
import { IdentifierAccess } from "./IdentifierAccess";

export function getIdentifiersSwitchCaseUses(
  statement: types.SwitchCase
): IdentifierAccess[] {
  let identifiers: IdentifierAccess[] = [];

  if (statement.test) {
    identifiers.push(...getIdentifiersExpressionUses(statement.test));
  }

  identifiers.push(...getIdentifiersStatementsUse(statement.consequent));

  return identifiers;
}
