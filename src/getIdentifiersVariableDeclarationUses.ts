import * as types from "@babel/types";
import { getIdentifiersExpressionUses } from "./getIdentifiersExpressionUses";
import { getIdentifiersLValUses } from "./getIdentifiersLValUses";
import { IdentifierAccess } from "./IdentifierAccess";

export function getIdentifiersVariableDeclarationUses(
  declaration_: types.VariableDeclaration
): IdentifierAccess[] {
  let identifiers: IdentifierAccess[] = [];
  for (let declaration of declaration_.declarations) {
    identifiers.push(...getIdentifiersLValUses(declaration.id));

    if (declaration.init) {
      identifiers.push(...getIdentifiersExpressionUses(declaration.init));
    }
  }

  return identifiers;
}