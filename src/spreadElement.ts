import * as types from "@babel/types";
import { getIdentifiersExpressionUses, rewriteExpression } from "./expression";
import { IdentifierAccess_ } from "./IdentifierAccess";
import { PathNode } from "./path";

export function rewriteSpreadElement(
  spreadElement: types.SpreadElement,
  path: PathNode
): types.SpreadElement {
  return types.spreadElement(rewriteExpression(spreadElement.argument, path));
}

export function getIdentifiersSpreadElementUses(
  spreadElement: types.SpreadElement
): IdentifierAccess_ {
  return getIdentifiersExpressionUses(spreadElement.argument);
}
