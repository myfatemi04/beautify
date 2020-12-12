import * as types from "@babel/types";
import { IdentifierAccess_ } from "./IdentifierAccess";
import { PathNode } from "./path";
import { getIdentifiersMethodUses } from "./method";
import { getIdentifiersFunctionParamsUse } from "./functionParams";

export function getIdentifiersClassMethodUses(
  method: types.ClassMethod | types.ClassPrivateMethod
): IdentifierAccess_ {
  return getIdentifiersMethodUses(method);
}

export function rewriteClassMethod(
  method: types.ClassMethod | types.ClassPrivateMethod,
  path: PathNode
): types.ClassMethod | types.ClassPrivateMethod {
  let definedVars = getIdentifiersFunctionParamsUse(method.params);
  let rewriter = new PathNode(method.body.body, true, path, definedVars.set);
  rewriter.rewrite();

  return {
    ...method,
    body: types.blockStatement(rewriter.body),
  };
}
