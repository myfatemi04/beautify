import * as types from "@babel/types";
import { getIdentifiersLValUses } from "./lval";
import { IdentifierAccess_ } from "./IdentifierAccess";

export function getIdentifiersRestElementUses(
  element: types.RestElement
): IdentifierAccess_ {
  return getIdentifiersLValUses(element.argument);
}
