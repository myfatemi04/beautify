import * as types from "@babel/types";
import { rewriteClassBody } from "./classBody";
import { Scope } from "./scope";

export function rewriteClassExpression(
  expression: types.ClassExpression,
  scope: Scope
): types.ClassExpression {
  return types.classExpression(
    expression.id,
    expression.superClass,
    rewriteClassBody(expression.body, scope),
    expression.decorators
  );
}
