import * as types from "@babel/types";
import Preambleable from "./Preambleable";
import { rewriteExpressionsAndConcat } from "./rewriteExpression";
import { rewriteStatementWrapWithBlock } from "./rewriteStatement";
import { Scope } from "./scope";

/**
 * * Rewrites the test expression, splitting if necessary
 * * Wraps the consequent/alternate with brackets
 *
 * @param statement if (a) { b } else { c }
 * @param scope Scope
 */
export function rewriteIfStatement(
  statement: types.IfStatement,
  scope: Scope
): Preambleable<types.IfStatement> {
  let test = statement.test;
  let preamble = [];

  test = rewriteExpressionsAndConcat(test, scope, preamble);

  let consequent = statement.consequent;
  let alternate = statement.alternate;

  if (consequent) {
    consequent = rewriteStatementWrapWithBlock(consequent, scope);
  }

  if (alternate) {
    alternate = rewriteStatementWrapWithBlock(alternate, scope);
  }

  return {
    preamble,
    value: types.ifStatement(test, consequent, alternate),
  };
}
