import * as types from "@babel/types";
import { getIdentifiersExpressionUses } from "./expression";
import { IdentifierAccess } from "./IdentifierAccess";
import { getIdentifiersSpreadElementUses } from "./spreadElement";

export type Argument =
  | types.Expression
  | types.SpreadElement
  | types.JSXNamespacedName
  | types.ArgumentPlaceholder;

export function getIdentifiersArgumentsUse(
  args: Argument[]
): IdentifierAccess[] {
  let identifiers: IdentifierAccess[] = [];
  for (let arg of args) {
    if (types.isExpression(arg)) {
      identifiers.push(...getIdentifiersExpressionUses(arg));
    } else if (types.isSpreadElement(arg)) {
      identifiers.push(...getIdentifiersSpreadElementUses(arg));
    } else if (types.isArgumentPlaceholder(arg)) {
      // do nothing
    } else {
      throw new Error(
        "getIdentifiersArgumentsUse() does not have case " + arg.type
      );
    }
  }

  return identifiers;
}
