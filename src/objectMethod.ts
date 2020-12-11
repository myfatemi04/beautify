import * as types from "@babel/types";
import { rewriteScopedStatementArray } from "./statementArray";
import { PathNode } from "./path";

export function rewriteObjectMethod(
  objectMethod: types.ObjectMethod,
  path: PathNode
): types.ObjectMethod {
  let body = rewriteScopedStatementArray(objectMethod.body.body, path);
  return types.objectMethod(
    objectMethod.kind,
    objectMethod.key,
    objectMethod.params,
    types.blockStatement(body)
  );
}
