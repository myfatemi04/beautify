import * as types from "@babel/types";
import { getIdentifiersLValUses } from "./lval";
import { getIdentifiersPatternUses } from "./pattern";
import { IdentifierAccess } from "./IdentifierAccess";

export function getIdentifiersPatternLikeUses(
  patternLike: types.PatternLike
): IdentifierAccess[] {
  if (patternLike.type === "RestElement") {
    return getIdentifiersLValUses(patternLike.argument);
  } else if (patternLike.type === "Identifier") {
    return [{ type: "set", id: patternLike }];
  } else if (types.isPattern(patternLike)) {
    return getIdentifiersPatternUses(patternLike);
  } else {
    throw new Error("Patternlike was not Patternlike: " + patternLike);
  }
}
