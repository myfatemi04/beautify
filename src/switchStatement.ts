import * as types from "@babel/types";
import { getIdentifiersExpressionUses, rewriteExpression } from "./expression";
import { rewriteStatementArray } from "./statementArray";
import { PathNode } from "./path";
import { IdentifierAccess } from "./IdentifierAccess";
import { getIdentifiersSwitchCaseUses } from "./switchCase";

export function rewriteSwitchCase(
  case_: types.SwitchCase,
  path: PathNode
): types.SwitchCase {
  // preambles are NOT allowed
  // if test = undefined, it's a "default" case
  let test = case_.test ? rewriteExpression(case_.test, path) : undefined;
  let consequent = rewriteStatementArray(case_.consequent, path);

  return types.switchCase(test, consequent);
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
): IdentifierAccess[] {
  types.assertSwitchStatement(statement);

  let identifiers: IdentifierAccess[] = [];
  identifiers.push(...getIdentifiersExpressionUses(statement.discriminant));

  for (let case_ of statement.cases) {
    identifiers.push(...getIdentifiersSwitchCaseUses(case_));
  }

  return identifiers;
}
