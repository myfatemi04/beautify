import * as types from "@babel/types";
import { getIdentifiersExpressionUses } from "./expression";
import { rewriteSequenceExpressionStatementGetLastValue } from "./sequenceExpression";
import {
  getIdentifiersStatementUses,
  rewriteStatement,
  rewriteStatementWrapWithBlock,
} from "./statement";
import { PathNode } from "./path";
import { concat, IdentifierAccess_ } from "./IdentifierAccess";

/**
 * * Rewrites the test expression, splitting if necessary
 * * Wraps the consequent/alternate with brackets
 *
 * @param statement if (a) { b } else { c }
 * @param path path
 */
export function rewriteIfStatement(
  statement: types.IfStatement,
  path: PathNode
): types.Statement[] {
  let preamble = [];
  let { test, consequent, alternate } = statement;

  // split up "if" sequences
  if (types.isSequenceExpression(test)) {
    let rewritten = rewriteSequenceExpressionStatementGetLastValue(test, path);
    test = rewritten.value;
    preamble = rewritten.preceeding;
  }

  if (consequent) {
    consequent = rewriteStatementWrapWithBlock(consequent, path);
  }

  if (alternate) {
    let alternate_ = rewriteStatement(alternate, path);
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
): IdentifierAccess_ {
  let identifiers = concat(
    getIdentifiersExpressionUses(statement.test),
    getIdentifiersStatementUses(statement.consequent)
  );

  if (statement.alternate) {
    identifiers = concat(
      identifiers,
      getIdentifiersStatementUses(statement.alternate)
    );
  }

  return identifiers;
}
