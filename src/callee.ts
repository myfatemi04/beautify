import * as types from "@babel/types";
import { getIdentifiersExpressionUses } from "./expression";
import { IdentifierAccess } from "./IdentifierAccess";

export function getIdentifiersCalleeUses(
  expr: types.Expression | types.V8IntrinsicIdentifier
): IdentifierAccess[] {
  if (types.isV8IntrinsicIdentifier(expr)) {
    return [];
  } else {
    return getIdentifiersExpressionUses(expr);
  }
}
