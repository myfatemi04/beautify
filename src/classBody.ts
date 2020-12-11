import * as types from "@babel/types";
import { rewriteClassMethod } from "./classMethod";
import {
  rewriteClassProperty,
  rewriteClassPrivateProperty,
} from "./classProperty";
import { PathNode } from "./path";

export function rewriteClassBody(
  expression_: types.ClassBody,
  path: PathNode
): types.ClassBody {
  let body = [];
  for (let expression of expression_.body) {
    if (
      expression.type === "ClassMethod" ||
      expression.type === "ClassPrivateMethod"
    ) {
      body.push(rewriteClassMethod(expression, path));
    } else if (expression.type === "ClassProperty") {
      body.push(rewriteClassProperty(expression, path));
    } else if (expression.type === "ClassPrivateProperty") {
      body.push(rewriteClassPrivateProperty(expression, path));
    } else {
      // tsDeclareMethod, tsIndexSignature
      body.push(expression, path);
    }
  }

  return {
    ...expression_,
    body,
  };
}
