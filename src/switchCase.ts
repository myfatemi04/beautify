import * as types from "@babel/types";
import { getIdentifiersExpressionUses } from "./expression";
import { getIdentifiersStatementsUse } from "./statement";
import {
  concat,
  createIdentifierAccess,
  IdentifierAccess_,
} from "./IdentifierAccess";

export function getIdentifiersSwitchCaseUses(
  statement: types.SwitchCase
): IdentifierAccess_ {
  let identifiers: IdentifierAccess_ = createIdentifierAccess();

  if (statement.test) {
    identifiers = concat(
      identifiers,
      getIdentifiersExpressionUses(statement.test)
    );
  }

  identifiers = concat(
    identifiers,
    getIdentifiersStatementsUse(statement.consequent)
  );

  return identifiers;
}
