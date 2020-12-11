import * as types from "@babel/types";
import {
  getIdentifiersClassMethodUses,
  rewriteClassMethod,
} from "./classMethod";
import {
  rewriteClassProperty,
  rewriteClassPrivateProperty,
  getIdentifiersClassPropertyUses,
} from "./classProperty";
import { IdentifierAccess } from "./IdentifierAccess";
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

export function getIdentifiersClassBodyUses(
  body: types.ClassBody
): IdentifierAccess[] {
  let identifiers: IdentifierAccess[] = [];

  for (let line of body.body) {
    if (line.type === "ClassMethod" || line.type === "ClassPrivateMethod") {
      identifiers.push(...getIdentifiersClassMethodUses(line));
    } else if (
      line.type === "ClassPrivateProperty" ||
      line.type === "ClassProperty"
    ) {
      identifiers.push(...getIdentifiersClassPropertyUses(line));
    } else {
      throw new Error(
        "getIdentifiersClassBodyUses() doesn't handle case " + line
      );
    }
  }

  return identifiers;
}
