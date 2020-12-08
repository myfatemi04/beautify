import * as types from "@babel/types";
import { getIdentifiersExpressionUses } from "./getIdentifiersExpressionUses";
import { getIdentifiersLValUses } from "./getIdentifiersLValUses";
import { getIdentifiersPatternLikeUses } from "./getIdentifiersPatternLikeUses";
import { getIdentifiersRestElementUses } from "./getIdentifiersRestElementUses";
import { IdentifierAccess } from "./IdentifierAccess";

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
    if (property.type === "ObjectProperty") {
      if (types.isPatternLike(property.value)) {
        identifiers.push(...getIdentifiersPatternLikeUses(property.value));
      } else {
        identifiers.push(...getIdentifiersExpressionUses(property.value));
      }
    } else if (property.type === "RestElement") {
      identifiers.push(...getIdentifiersRestElementUses(property));
    }
  }

  return identifiers;
}

export function getIdentifiersPatternUses(
  pattern: types.Pattern
): IdentifierAccess[] {
  if (pattern.type === "ArrayPattern") {
    return getIdentifiersArrayPatternUses(pattern);
  } else if (pattern.type === "ObjectPattern") {
    return getIdentifiersObjectPatternUses(pattern);
  } else if (pattern.type === "AssignmentPattern") {
    return getIdentifiersAssignmentPatternUses(pattern);
  } else {
    throw new Error("Unexpected pattern:" + pattern);
  }
}
