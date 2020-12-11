import * as types from "@babel/types";
import { rewriteStatementArray } from "./statementArray";
import { PathNode } from "./path";

/**
 * Rewrites the body as an array of statements
 * @param statement Block statement to rewrite
 * @param path path
 */
export function rewriteBlockStatement(
  statement: types.BlockStatement,
  path: PathNode
): types.BlockStatement {
  return types.blockStatement(rewriteStatementArray(statement.body, path));
}
