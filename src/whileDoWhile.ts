import * as types from "@babel/types";
import { getIdentifiersExpressionUses, rewriteExpression } from "./expression";
import {
  getIdentifiersStatementUses,
  rewriteStatementWrapWithBlock,
} from "./statement";
import { Scope } from "./scope";
import { IdentifierAccess } from "./IdentifierAccess";

export function rewriteDoWhileStatement(
  statement: types.DoWhileStatement,
  scope: Scope
): types.DoWhileStatement {
  let body = rewriteStatementWrapWithBlock(statement.body, scope);

  // If there's something in the test, add it to the end of the loop
  let test = rewriteExpression(statement.test, scope);
  return types.doWhileStatement(test, body);
}

export function rewriteWhileStatement(
  statement: types.WhileStatement,
  scope: Scope
): types.WhileStatement {
  let body = rewriteStatementWrapWithBlock(statement.body, scope);
  let test = rewriteExpression(statement.test, scope);

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
