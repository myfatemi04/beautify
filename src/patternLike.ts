import * as types from "@babel/types";
import { getIdentifiersLValUses } from "./lval";
import { getIdentifiersPatternUses } from "./pattern";
import { createIdentifierAccess, IdentifierAccess_ } from "./IdentifierAccess";

export function getIdentifiersPatternLikeUses(
  patternLike: types.PatternLike
): IdentifierAccess_ {
  if (patternLike.type === "RestElement") {
    return getIdentifiersLValUses(patternLike.argument);
  } else if (patternLike.type === "Identifier") {
    let identifiers = createIdentifierAccess();
    identifiers.set.add(patternLike.name);
    return identifiers;
  } else if (types.isPattern(patternLike)) {
    return getIdentifiersPatternUses(patternLike);
  } else {
    throw new Error("Patternlike was not Patternlike: " + patternLike);
  }
}
