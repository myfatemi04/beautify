import * as types from "@babel/types";
import { getIdentifiersExpressionUses, rewriteExpression } from "./expression";
import {
  getIdentifiersStatementUses,
  rewriteStatementWrapWithBlock,
} from "./statement";
import { PathNode } from "./path";
import { IdentifierAccess } from "./IdentifierAccess";

export function rewriteDoWhileStatement(
  statement: types.DoWhileStatement,
  path: PathNode
): types.DoWhileStatement {
  let body = rewriteStatementWrapWithBlock(statement.body, path);

  // If there's something in the test, add it to the end of the loop
  let test = rewriteExpression(statement.test, path);
  return types.doWhileStatement(test, body);
}

export function rewriteWhileStatement(
  statement: types.WhileStatement,
  path: PathNode
): types.WhileStatement {
  let body = rewriteStatementWrapWithBlock(statement.body, path);
  let test = rewriteExpression(statement.test, path);

  return types.whileStatement(test, body);
}

export function getIdentifiersWhileDoWhileStatementUses(
  statement: types.WhileStatement | types.DoWhileStatement
): IdentifierAccess[] {
  return [
    ...getIdentifiersExpressionUses(statement.test),
    ...getIdentifiersStatementUses(statement.body),
  ];
}
