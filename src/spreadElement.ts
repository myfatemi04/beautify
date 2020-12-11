import * as types from "@babel/types";
import { getIdentifiersExpressionUses, rewriteExpression } from "./expression";
import { IdentifierAccess } from "./IdentifierAccess";
import { Scope } from "./scope";

export function rewriteSpreadElement(
  spreadElement: types.SpreadElement,
  scope: Scope
): types.SpreadElement {
  return types.spreadElement(rewriteExpression(spreadElement.argument, scope));
}

export function getIdentifiersSpreadElementUses(
  spreadElement: types.SpreadElement
): IdentifierAccess[] {
  return getIdentifiersExpressionUses(spreadElement.argument);
}
