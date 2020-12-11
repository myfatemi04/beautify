import * as types from "@babel/types";
import { rewriteStatementWrapWithBlock } from "./statement";
import { PathNode } from "./path";

export function rewriteLabeledStatement(
  statement: types.LabeledStatement,
  path: PathNode
): types.LabeledStatement {
  return {
    ...statement,
    body: rewriteStatementWrapWithBlock(statement.body, path),
  };
}
