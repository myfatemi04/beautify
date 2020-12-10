import * as types from "@babel/types";
import { rewriteExpression } from "./rewriteExpression";
import { rewriteExpressionStatement } from "./rewriteExpressionStatement";
import { rewriteSequenceExpressionStatementGetLastValue } from "./rewriteSequenceExpression";
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
): types.Statement[] {
  let preamble = [];
  let { test, consequent, alternate } = statement;

  // split up "if" sequences
  if (types.isSequenceExpression(test)) {
    let rewritten = rewriteSequenceExpressionStatementGetLastValue(test, scope);
    test = rewritten.value;
    preamble = rewritten.preceeding;
  }

  if (consequent) {
    consequent = rewriteStatementWrapWithBlock(consequent, scope);
  }

  if (alternate) {
    alternate = rewriteStatementWrapWithBlock(alternate, scope);
  }

  return [...preamble, types.ifStatement(test, consequent, alternate)];
}
