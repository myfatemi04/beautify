import * as types from "@babel/types";
import { IdentifierAccess } from "./IdentifierAccess";

export function getIdentifiersPrivateNameUses(
  expression: types.PrivateName
): IdentifierAccess[] {
  return [{ type: "set", id: expression.id }];
}
