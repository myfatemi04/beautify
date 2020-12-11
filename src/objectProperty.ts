import * as types from "@babel/types";
import { getIdentifiersExpressionUses, rewriteExpression } from "./expression";
import { getIdentifiersPatternLikeUses } from "./patternLike";
import { IdentifierAccess } from "./IdentifierAccess";
import { PathNode } from "./path";

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

export function rewriteObjectProperty(
  property: types.ObjectProperty,
  path: PathNode
): types.ObjectProperty {
  let key = property.key;
  if (!property.computed) {
    key = rewriteExpression(key, path);
  }
  let value = property.value;
  if (types.isExpression(value)) {
    value = rewriteExpression(value, path);
  } else if (types.isRestElement(value)) {
  }
  return types.objectProperty(key, value);
}
