import * as types from "@babel/types";
import { getIdentifiersExpressionUses } from "./getIdentifiersExpressionUses";
import { getIdentifiersPatternLikeUses } from "./getIdentifiersPatternLikeUses";
import { IdentifierAccess } from "./IdentifierAccess";

/**
 * Says any identifiers being assigned to here are "set"
 * @param lval The left side of an assignment
 */
export function getIdentifiersLValUses(lval: types.LVal): IdentifierAccess[] {
  if (types.isPatternLike(lval)) {
    return getIdentifiersPatternLikeUses(lval);
  } else if (lval.type === "MemberExpression") {
    return getIdentifiersExpressionUses(lval);
  } else if (lval.type === "TSParameterProperty") {
    return getIdentifiersLValUses(lval.parameter);
  } else {
    throw new Error("Invalid lval type for lval" + JSON.stringify(lval));
  }
}