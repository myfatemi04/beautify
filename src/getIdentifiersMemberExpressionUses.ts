import * as types from "@babel/types";
import { getIdentifiersExpressionUses } from "./getIdentifiersExpressionUses";
import { getIdentifiersPrivateNameUses } from "./getIdentifiersPrivateNameUses";
import { IdentifierAccess } from "./IdentifierAccess";

export function getIdentifiersMemberExpressionUses(
  expression: types.MemberExpression
): IdentifierAccess[] {
  let identifiers: IdentifierAccess[] = [];
  identifiers.push(...getIdentifiersExpressionUses(expression.object));

  if (expression.computed) {
    if (types.isPrivateName(expression.property)) {
      identifiers.push(...getIdentifiersPrivateNameUses(expression.property));
    } else {
      identifiers.push(...getIdentifiersExpressionUses(expression.property));
    }
  } else {
    // don't do anything if not computed
  }

  return identifiers;
}
