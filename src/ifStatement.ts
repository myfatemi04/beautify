import * as types from "@babel/types";
import { getIdentifiersExpressionUses, rewriteExpression } from "./expression";
import { rewriteExpressionStatement } from "./expressionStatement";
import { rewriteSequenceExpressionStatementGetLastValue } from "./sequenceExpression";
import {
  getIdentifiersStatementUses,
  rewriteStatement,
  rewriteStatementWrapWithBlock,
} from "./statement";
import { Scope } from "./scope";
import { IdentifierAccess } from "./IdentifierAccess";
import { combine } from "./combine";

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
    let alternate_ = rewriteStatement(alternate, scope);
    // use proper block wrapping
    if (alternate_.length > 1) {
      alternate = types.blockStatement(alternate_);
    } else if (types.isIfStatement(alternate_[0])) {
      alternate = alternate_[0];
    } else if (types.isBlockStatement(alternate_[0])) {
      alternate = alternate_[0];
    } else {
      alternate = types.blockStatement(alternate_);
    }
  }

  return [...preamble, types.ifStatement(test, consequent, alternate)];
}

export function getIdentifiersIfStatementUses(
  statement: types.IfStatement
): IdentifierAccess[] {
  let identifiers = combine(
    getIdentifiersExpressionUses(statement.test),
    getIdentifiersStatementUses(statement.consequent)
  );

  if (statement.alternate) {
    identifiers.push(...getIdentifiersStatementUses(statement.alternate));
  }

  return identifiers;
}