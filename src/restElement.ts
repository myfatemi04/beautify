import * as types from "@babel/types";
import { getIdentifiersLValUses } from "./lval";
import { IdentifierAccess } from "./IdentifierAccess";

export function getIdentifiersRestElementUses(
  element: types.RestElement
): IdentifierAccess[] {
  return getIdentifiersLValUses(element.argument);
}
