import * as types from "@babel/types";
import { rewriteClassMethod } from "./classMethod";
import {
  rewriteClassProperty,
  rewriteClassPrivateProperty,
} from "./classProperty";
import { Scope } from "./scope";

export function rewriteClassBody(
  expression_: types.ClassBody,
  scope: Scope
): types.ClassBody {
  let body = [];
  for (let expression of expression_.body) {
    if (
      expression.type === "ClassMethod" ||
      expression.type === "ClassPrivateMethod"
    ) {
      body.push(rewriteClassMethod(expression, scope));
    } else if (expression.type === "ClassProperty") {
      body.push(rewriteClassProperty(expression, scope));
    } else if (expression.type === "ClassPrivateProperty") {
      body.push(rewriteClassPrivateProperty(expression, scope));
    } else {
      // tsDeclareMethod, tsIndexSignature
      body.push(expression, scope);
    }
  }

  return {
    ...expression_,
    body,
  };
}
