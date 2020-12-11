import * as types from "@babel/types";
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
  let rewritten = new PathNode(statement.body, false, path);
  rewritten.rewrite();
  return types.blockStatement(rewritten.body);
}
