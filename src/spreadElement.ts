import * as types from "@babel/types";
import { getIdentifiersExpressionUses, rewriteExpression } from "./expression";
import { IdentifierAccess } from "./IdentifierAccess";
import { PathNode } from "./path";

export function rewriteSpreadElement(
  spreadElement: types.SpreadElement,
  path: PathNode
): types.SpreadElement {
  return types.spreadElement(rewriteExpression(spreadElement.argument, path));
}

export function getIdentifiersSpreadElementUses(
  spreadElement: types.SpreadElement
): IdentifierAccess[] {
  return getIdentifiersExpressionUses(spreadElement.argument);
}
