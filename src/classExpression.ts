import * as types from "@babel/types";
import { rewriteClassBody } from "./classBody";
import { PathNode } from "./path";

export function rewriteClassExpression(
  expression: types.ClassExpression,
  path: PathNode
): types.ClassExpression {
  return types.classExpression(
    expression.id,
    expression.superClass,
    rewriteClassBody(expression.body, path),
    expression.decorators
  );
}
