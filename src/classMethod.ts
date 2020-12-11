import * as types from "@babel/types";
import { IdentifierAccess } from "./IdentifierAccess";
import { PathNode } from "./path";
import { getIdentifiersMethodUses } from "./method";

export function getIdentifiersClassMethodUses(
  method: types.ClassMethod | types.ClassPrivateMethod
): IdentifierAccess[] {
  return getIdentifiersMethodUses(method);
}

export function rewriteClassMethod(
  method: types.ClassMethod | types.ClassPrivateMethod,
  path: PathNode
): types.ClassMethod | types.ClassPrivateMethod {
  let rewriter = new PathNode(method.body.body, true, path);
  rewriter.rewrite();

  return {
    ...method,
    body: types.blockStatement(rewriter.body),
  };
}
