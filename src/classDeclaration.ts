import * as types from "@babel/types";
import { rewriteClassBody } from "./classBody";
import { Scope } from "./scope";

export function rewriteClassDeclaration(
  expression: types.ClassDeclaration,
  scope: Scope
): types.ClassDeclaration {
  return types.classDeclaration(
    expression.id,
    expression.superClass,
    rewriteClassBody(expression.body, scope),
    expression.decorators
  );
}
