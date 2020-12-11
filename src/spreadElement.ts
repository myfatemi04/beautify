import * as types from "@babel/types";
import { rewriteExpression } from "./expression";
import { Scope } from "./scope";

export function rewriteSpreadElement(
  spreadElement: types.SpreadElement,
  scope: Scope
): types.SpreadElement {
  return types.spreadElement(rewriteExpression(spreadElement.argument, scope));
}
