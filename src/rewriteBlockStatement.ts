import * as types from "@babel/types";
import { rewriteStatementArray } from "./rewriteStatementArray";
import { Scope } from "./scope";

export function rewriteBlockStatement(
  statement: types.BlockStatement,
  scope: Scope
): types.BlockStatement {
  return types.blockStatement(rewriteStatementArray(statement.body, scope));
}
