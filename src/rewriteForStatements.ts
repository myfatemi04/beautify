import * as types from "@babel/types";
import { rewriteExpression } from "./rewriteExpression";
import { rewriteSequenceExpressionStatementGetLastValue } from "./rewriteSequenceExpression";
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
): types.Statement[] {
  let preamble = [];
  let init = undefined;
  let test = statement.test;

  if (statement.init) {
    if (statement.init.type === "VariableDeclaration") {
      let declarations = rewriteVariableDeclaration(statement.init, scope);
      preamble.push(...declarations);
    } else if (statement.init.type === "SequenceExpression") {
      let {
        value,
        preceeding,
      } = rewriteSequenceExpressionStatementGetLastValue(statement.init, scope);
      
      init = value;
      preamble = preceeding;
    } else {
      init = rewriteExpression(statement.init, scope);
    }
  }

  if (statement.test) {
    test = rewriteExpression(statement.test, scope);
  }

  return [
    ...preamble,
    types.forStatement(
      init,
      test,
      statement.update,
      rewriteStatementWrapWithBlock(statement.body, scope)
    ),
  ];
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
): types.ForInStatement | types.ForOfStatement {
  let rewrittenBody = rewriteStatement(statement.body, scope);
  let right = rewriteExpression(statement.right, scope);

  return {
    ...statement,
    body: types.blockStatement(rewrittenBody),
    right,
  };
}
