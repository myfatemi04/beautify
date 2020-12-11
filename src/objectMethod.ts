import * as types from "@babel/types";
import { rewriteScopedStatementArray } from "./statementArray";
import { Scope } from "./scope";

export function rewriteObjectMethod(
  objectMethod: types.ObjectMethod,
  scope: Scope
): types.ObjectMethod {
  let body = rewriteScopedStatementArray(objectMethod.body.body, scope);
  return types.objectMethod(
    objectMethod.kind,
    objectMethod.key,
    objectMethod.params,
    types.blockStatement(body)
  );
}
