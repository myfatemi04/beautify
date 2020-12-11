import * as types from "@babel/types";
import { getIdentifiersExpressionUses, rewriteExpression } from "./expression";
import { rewriteSequenceExpressionStatementGetLastValue } from "./sequenceExpression";
import {
  getIdentifiersStatementUses,
  rewriteStatement,
  rewriteStatementWrapWithBlock,
} from "./statement";
import {
  getIdentifiersVariableDeclarationUses,
  rewriteVariableDeclaration,
} from "./variableDeclaration";
import { PathNode } from "./path";
import { IdentifierAccess } from "./IdentifierAccess";
import { getIdentifiersLValUses } from "./lval";

/**
 * Rewrites a For statement. If there is more than one variable declaration
 * in the initializer, moves all but one to before the initializer.
 * @param statement For statement [for(let x = 0; x < a; x++)]
 * @param path path
 */
export function rewriteForStatement(
  statement: types.ForStatement,
  path: PathNode
): types.Statement[] {
  let preamble = [];
  let init = undefined;
  let test = statement.test;

  if (statement.init) {
    if (statement.init.type === "VariableDeclaration") {
      let declarations = rewriteVariableDeclaration(statement.init, path);
      preamble.push(...declarations);
    } else if (statement.init.type === "SequenceExpression") {
      let {
        value,
        preceeding,
      } = rewriteSequenceExpressionStatementGetLastValue(statement.init, path);

      init = value;
      preamble = preceeding;
    } else {
      init = rewriteExpression(statement.init, path);
    }
  }

  if (statement.test) {
    test = rewriteExpression(statement.test, path);
  }

  return [
    ...preamble,
    types.forStatement(
      init,
      test,
      statement.update,
      rewriteStatementWrapWithBlock(statement.body, path)
    ),
  ];
}

/**
 * Rewrites the body and the right side of the statement.
 * If the setup would be better split up, it splits it up.
 *
 * @param statement For of / For in statement (for let x of ...)
 * @param path path
 */
export function rewriteForOfInStatement(
  statement: types.ForOfStatement | types.ForInStatement,
  path: PathNode
): types.ForInStatement | types.ForOfStatement {
  let rewrittenBody = rewriteStatement(statement.body, path);
  let right = rewriteExpression(statement.right, path);

  return {
    ...statement,
    body: types.blockStatement(rewrittenBody),
    right,
  };
}

export function getIdentifiersForStatementUses(
  statement: types.ForStatement
): IdentifierAccess[] {
  {
    let identifiers = [];
    if (statement.init) {
      if (types.isExpression(statement.init)) {
        identifiers.push(...getIdentifiersExpressionUses(statement.init));
      } else {
        identifiers.push(
          ...getIdentifiersVariableDeclarationUses(statement.init)
        );
      }
    }

    if (statement.test) {
      identifiers.push(...getIdentifiersExpressionUses(statement.test));
    }

    if (statement.update) {
      identifiers.push(...getIdentifiersExpressionUses(statement.update));
    }

    identifiers.push(...getIdentifiersStatementUses(statement.body));

    return identifiers;
  }
}

export function getIdentifiersForOfInStatementUses(
  statement: types.ForInStatement | types.ForOfStatement
): IdentifierAccess[] {
  let identifiers: IdentifierAccess[] = [];

  if (types.isLVal(statement.left)) {
    identifiers.push(...getIdentifiersLValUses(statement.left));
  } else {
    identifiers.push(...getIdentifiersVariableDeclarationUses(statement.left));
  }

  identifiers.push(...getIdentifiersExpressionUses(statement.right));
  identifiers.push(...getIdentifiersStatementUses(statement.body));

  return identifiers;
}
