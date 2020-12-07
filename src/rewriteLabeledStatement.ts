import * as types from "@babel/types";
import { rewriteStatementWrapWithBlock } from "./rewriteStatement";
import { Scope } from "./scope";

export function rewriteLabeledStatement(
  statement: types.LabeledStatement,
  scope: Scope
): types.LabeledStatement {
  return {
    ...statement,
    body: rewriteStatementWrapWithBlock(statement.body, scope),
  };
}
