import * as types from "@babel/types";
import { getIdentifiersExpressionUses } from "./expression";
import {
  concat,
  createIdentifierAccess,
  IdentifierAccess_,
} from "./IdentifierAccess";
import { getIdentifiersSpreadElementUses } from "./spreadElement";

export type Argument =
  | types.Expression
  | types.SpreadElement
  | types.JSXNamespacedName
  | types.ArgumentPlaceholder;

export function getIdentifiersArgumentsUse(
  args: Argument[]
): IdentifierAccess_ {
  let identifiers: IdentifierAccess_ = createIdentifierAccess();
  for (let arg of args) {
    if (types.isExpression(arg)) {
      identifiers = concat(identifiers, getIdentifiersExpressionUses(arg));
    } else if (types.isSpreadElement(arg)) {
      identifiers = concat(identifiers, getIdentifiersSpreadElementUses(arg));
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
