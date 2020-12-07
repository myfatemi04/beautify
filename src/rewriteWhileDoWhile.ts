import * as types from "@babel/types";
import Preambleable from "./Preambleable";
import {
  rewriteExpression,
  rewriteExpressionsAndConcat,
} from "./rewriteExpression";
import { rewriteStatementWrapWithBlock } from "./rewriteStatement";
import { Scope } from "./scope";

export function rewriteDoWhileStatement(
  statement: types.DoWhileStatement,
  scope: Scope
): types.DoWhileStatement {
  let body = rewriteStatementWrapWithBlock(statement.body, scope);

  // If there's something in the test, add it to the end of the loop
  let test = rewriteExpressionsAndConcat(statement.test, scope, body.body);
  return types.doWhileStatement(test, body);
}

export function rewriteWhileStatement(
  statement: types.WhileStatement,
  scope: Scope
): Preambleable<types.WhileStatement> {
  let body = rewriteStatementWrapWithBlock(statement.body, scope);
  let testRewritten = rewriteExpression(statement.test, scope);
  let test = testRewritten.value;
  let preamble = [];

  // If there's a preamble in the test, add before the while loop
  // and at the end of the block
  if (testRewritten.preamble) {
    preamble = testRewritten.preamble;
    body.body = body.body.concat(testRewritten.preamble);
  }

  return {
    preamble,
    value: types.whileStatement(test, body),
  };
}
