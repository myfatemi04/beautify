import * as types from "@babel/types";
import Preambleable from "./Preambleable";
import { rewriteExpressionsAndConcat } from "./rewriteExpression";
import {
  rewriteStatement,
  rewriteStatementWrapWithBlock,
} from "./rewriteStatement";
import { rewriteVariableDeclaration } from "./rewriteVariableDeclaration";
import { Scope } from "./scope";

/**
 * Rewrites a For statement. If there is more than one variable declaration
 * in the initializer, moves all but one to before the initializer.
 * @param statement For statement [for(let x = 0; x < a; x++)]
 * @param scope Scope
 */
export function rewriteForStatement(
  statement: types.ForStatement,
  scope: Scope
): Preambleable<types.ForStatement> {
  let preamble = [];
  let init = undefined;
  let test = statement.test;

  if (statement.init) {
    if (statement.init.type === "VariableDeclaration") {
      let { preamble: preamble_ } = rewriteVariableDeclaration(
        statement.init,
        scope
      );
      if (preamble_.length > 0) {
        init = preamble_[0];
        preamble = preamble.concat(preamble_.slice(1));
      }
    } else {
      init = rewriteExpressionsAndConcat(statement.init, scope, preamble);
    }
  }

  if (statement.test) {
    test = rewriteExpressionsAndConcat(statement.test, scope, preamble);
  }

  return {
    preamble,
    value: types.forStatement(
      init,
      test,
      statement.update,
      rewriteStatementWrapWithBlock(statement.body, scope)
    ),
  };
}

/**
 * Rewrites the body and the right side of the statement.
 * If the setup would be better split up, it splits it up.
 *
 * @param statement For of / For in statement (for let x of ...)
 * @param scope Scope
 */
export function rewriteForOfInStatement(
  statement: types.ForOfStatement | types.ForInStatement,
  scope: Scope
): Preambleable<types.ForInStatement | types.ForOfStatement> {
  let preamble = [];
  let rewrittenBody = rewriteStatement(statement.body, scope);
  let right = rewriteExpressionsAndConcat(statement.right, scope, preamble);

  return {
    preamble,
    value: {
      ...statement,
      body: rewrittenBody.value,
      right,
    },
  };
}
