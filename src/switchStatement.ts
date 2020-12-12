import * as types from "@babel/types";
import { getIdentifiersExpressionUses, rewriteExpression } from "./expression";
import { PathNode } from "./path";
import {
  concat,
  createIdentifierAccess,
  IdentifierAccess_,
} from "./IdentifierAccess";
import { getIdentifiersSwitchCaseUses } from "./switchCase";
import { rewriteStatement } from "./statement";

export function rewriteSwitchCase(
  case_: types.SwitchCase,
  path: PathNode
): types.SwitchCase {
  // preambles are NOT allowed
  // if test = undefined, it's a "default" case
  let test = case_.test ? rewriteExpression(case_.test, path) : undefined;
  let newStatements: types.Statement[] = [];
  for (let statement of case_.consequent) {
    newStatements.push(...rewriteStatement(statement, path));
  }

  return types.switchCase(test, newStatements);
}

export function rewriteSwitchStatement(
  statement: types.SwitchStatement,
  path: PathNode
): types.SwitchStatement {
  let discriminant = rewriteExpression(statement.discriminant, path);
  let cases = statement.cases.map((case_) => rewriteSwitchCase(case_, path));
  return types.switchStatement(discriminant, cases);
}

export function getIdentifiersSwitchStatementUses(
  statement: types.SwitchStatement
): IdentifierAccess_ {
  types.assertSwitchStatement(statement);

  let identifiers: IdentifierAccess_ = createIdentifierAccess();
  identifiers = concat(
    identifiers,
    getIdentifiersExpressionUses(statement.discriminant)
  );

  for (let case_ of statement.cases) {
    identifiers = concat(identifiers, getIdentifiersSwitchCaseUses(case_));
  }

  return identifiers;
}
