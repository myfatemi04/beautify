import * as types from "@babel/types";
import { getIdentifiersExpressionUses } from "./expression";
import { createIdentifierAccess, IdentifierAccess_ } from "./IdentifierAccess";

export function getIdentifiersCalleeUses(
  expr: types.Expression | types.V8IntrinsicIdentifier
): IdentifierAccess_ {
  if (types.isV8IntrinsicIdentifier(expr)) {
    return createIdentifierAccess();
  } else {
    return getIdentifiersExpressionUses(expr);
  }
}
