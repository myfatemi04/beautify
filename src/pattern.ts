import * as types from "@babel/types";
import { getIdentifiersExpressionUses } from "./expression";
import { getIdentifiersLValUses } from "./lval";
import { getIdentifiersPatternLikeUses } from "./patternLike";
import { getIdentifiersRestElementUses } from "./restElement";
import { IdentifierAccess } from "./IdentifierAccess";
import expressionHasSideEffects from "./expressionHasSideEffects";

/*
 * PATTERNS
 * These are the object destructuring things. Any identifiers found here are "set".
 */

/**
 * Takes the right side, says it is being used as a default value.
 * Takes the left side, says it is being updated.
 * @param pattern Things like: constructor(a = b): This is like a default value
 */
export function getIdentifiersAssignmentPatternUses(
  pattern: types.AssignmentPattern
): IdentifierAccess[] {
  let identifiers: IdentifierAccess[] = [];

  // the left value: we are setting any identifiers found here
  identifiers.push(...getIdentifiersLValUses(pattern.left));

  // the default value: we are using any identifiers found here
  identifiers.push(...getIdentifiersExpressionUses(pattern.right));

  return identifiers;
}

export function getIdentifiersArrayPatternUses(
  pattern: types.ArrayPattern
): IdentifierAccess[] {
  let identifiers: IdentifierAccess[] = [];

  for (let element of pattern.elements) {
    identifiers.push(...getIdentifiersLValUses(element));
  }

  return identifiers;
}

export function getIdentifiersObjectPatternUses(
  pattern: types.ObjectPattern
): IdentifierAccess[] {
  let identifiers: IdentifierAccess[] = [];

  for (let property of pattern.properties) {
    if (types.isObjectProperty(property)) {
      if (types.isPatternLike(property.value)) {
        identifiers.push(...getIdentifiersPatternLikeUses(property.value));
      } else {
        identifiers.push(...getIdentifiersExpressionUses(property.value));
      }
    } else if (types.isRestElement(property)) {
      identifiers.push(...getIdentifiersRestElementUses(property));
    } else {
      throw new Error("Object property invalid: " + property);
    }
  }

  return identifiers;
}

export function getIdentifiersPatternUses(
  pattern: types.Pattern
): IdentifierAccess[] {
  if (types.isArrayPattern(pattern)) {
    return getIdentifiersArrayPatternUses(pattern);
  } else if (types.isObjectPattern(pattern)) {
    return getIdentifiersObjectPatternUses(pattern);
  } else if (types.isAssignmentPattern(pattern)) {
    return getIdentifiersAssignmentPatternUses(pattern);
  } else {
    throw new Error("Unexpected pattern:" + pattern);
  }
}
