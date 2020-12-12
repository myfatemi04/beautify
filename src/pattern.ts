import * as types from "@babel/types";
import { getIdentifiersExpressionUses } from "./expression";
import { getIdentifiersLValUses } from "./lval";
import { getIdentifiersPatternLikeUses } from "./patternLike";
import { getIdentifiersRestElementUses } from "./restElement";
import {
  concat,
  createIdentifierAccess,
  IdentifierAccess_,
} from "./IdentifierAccess";

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
): IdentifierAccess_ {
  let identifiers: IdentifierAccess_ = createIdentifierAccess();

  // the left value: we are setting any identifiers found here
  identifiers = concat(identifiers, getIdentifiersLValUses(pattern.left));

  // the default value: we are using any identifiers found here
  identifiers = concat(
    identifiers,
    getIdentifiersExpressionUses(pattern.right)
  );

  return identifiers;
}

export function getIdentifiersArrayPatternUses(
  pattern: types.ArrayPattern
): IdentifierAccess_ {
  let identifiers: IdentifierAccess_ = createIdentifierAccess();

  for (let element of pattern.elements) {
    if (element != null) {
      identifiers = concat(identifiers, getIdentifiersLValUses(element));
    }
  }

  return identifiers;
}

export function getIdentifiersObjectPatternUses(
  pattern: types.ObjectPattern
): IdentifierAccess_ {
  let identifiers: IdentifierAccess_ = createIdentifierAccess();

  for (let property of pattern.properties) {
    if (types.isObjectProperty(property)) {
      if (types.isPatternLike(property.value)) {
        identifiers = concat(
          identifiers,
          getIdentifiersPatternLikeUses(property.value)
        );
      } else {
        identifiers = concat(
          identifiers,
          getIdentifiersExpressionUses(property.value)
        );
      }
    } else if (types.isRestElement(property)) {
      identifiers = concat(
        identifiers,
        getIdentifiersRestElementUses(property)
      );
    } else {
      throw new Error("Object property invalid: " + property);
    }
  }

  return identifiers;
}

export function getIdentifiersPatternUses(
  pattern: types.Pattern
): IdentifierAccess_ {
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
