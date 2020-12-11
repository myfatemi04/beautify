import * as types from "@babel/types";
import { getIdentifiersExpressionUses } from "./expression";
import { getIdentifiersStatementsUse } from "./statement";
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
