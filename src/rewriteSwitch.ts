import * as types from "@babel/types";
import Preambleable from "./Preambleable";
import {
  rewriteExpression,
  rewriteExpressionsAndReduce,
} from "./rewriteExpression";
import { rewriteStatementArray } from "./rewriteStatementArray";
import { Scope } from "./scope";

export function rewriteSwitchCase(
  case_: types.SwitchCase,
  scope: Scope
): types.SwitchCase {
  // preambles are NOT allowed
  // if test = undefined, it's a "default" case
  let test = case_.test
    ? rewriteExpression(case_.test, scope).value
    : undefined;
  let consequent = rewriteStatementArray(case_.consequent, scope);

  return types.switchCase(test, consequent);
}

export function rewriteSwitchStatement(
  statement: types.SwitchStatement,
  scope: Scope
): Preambleable<types.SwitchStatement> {
  let [preamble, [discriminant]] = rewriteExpressionsAndReduce(
    scope,
    statement.discriminant
  );
  let cases = statement.cases.map((case_) => rewriteSwitchCase(case_, scope));
  return {
    preamble,
    value: types.switchStatement(discriminant, cases),
  };
}
