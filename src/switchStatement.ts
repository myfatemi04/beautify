import * as types from "@babel/types";
import { rewriteExpression } from "./expression";
import { rewriteStatementArray } from "./statementArray";
import { Scope } from "./scope";

export function rewriteSwitchCase(
  case_: types.SwitchCase,
  scope: Scope
): types.SwitchCase {
  // preambles are NOT allowed
  // if test = undefined, it's a "default" case
  let test = case_.test ? rewriteExpression(case_.test, scope) : undefined;
  let consequent = rewriteStatementArray(case_.consequent, scope);

  return types.switchCase(test, consequent);
}

export function rewriteSwitchStatement(
  statement: types.SwitchStatement,
  scope: Scope
): types.SwitchStatement {
  let discriminant = rewriteExpression(statement.discriminant, scope);
  let cases = statement.cases.map((case_) => rewriteSwitchCase(case_, scope));
  return types.switchStatement(discriminant, cases);
}
