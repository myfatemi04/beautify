import * as types from "@babel/types";
import { getIdentifiersExpressionUses } from "./getIdentifiersExpressionUses";
import { getIdentifiersPatternLikeUses } from "./getIdentifiersPatternLikeUses";
import { IdentifierAccess } from "./IdentifierAccess";

export function getIdentifiersObjectPropertyUses(
  property: types.ObjectProperty
): IdentifierAccess[] {
  // "computed" is for things like { [a]: b }
  // if it's not computed, don't mistakenly call it an identifier
  let identifiers: IdentifierAccess[] = [];
  if (property.computed) {
    identifiers.push(...getIdentifiersExpressionUses(property.key));
  }

  if (types.isPatternLike(property.value)) {
    identifiers.push(...getIdentifiersPatternLikeUses(property.value));
  } else {
    identifiers.push(...getIdentifiersExpressionUses(property.value));
  }

  return identifiers;
}
