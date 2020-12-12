import * as types from "@babel/types";
import { createIdentifierAccess, IdentifierAccess_ } from "./IdentifierAccess";

export function getIdentifiersPrivateNameUses(
  expression: types.PrivateName
): IdentifierAccess_ {
  let access = createIdentifierAccess();
  access.set.add(expression.id.name);
  return access;
}
