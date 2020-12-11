import * as types from "@babel/types";
import { PathNode } from "./path";
import { getIdentifiersMethodUses } from "./method";

export function rewriteObjectMethod(
  objectMethod: types.ObjectMethod,
  path: PathNode
): types.ObjectMethod {
  let rewriter = new PathNode(objectMethod.body.body, true, path);
  rewriter.rewrite;
  return types.objectMethod(
    objectMethod.kind,
    objectMethod.key,
    objectMethod.params,
    types.blockStatement(rewriter.body)
  );
}

export function getIdentifiersObjectMethodUses(method: types.ObjectMethod) {
  return getIdentifiersMethodUses(method);
}
