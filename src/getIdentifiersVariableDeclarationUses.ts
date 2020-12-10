import * as types from "@babel/types";
import { getIdentifiersExpressionUses } from "./getIdentifiersExpressionUses";
import { getIdentifiersLValUses } from "./getIdentifiersLValUses";
import { IdentifierAccess } from "./IdentifierAccess";

export function getIdentifiersVariableDeclarationUses(
  declaration_: types.VariableDeclaration
): IdentifierAccess[] {
  let identifiers: IdentifierAccess[] = [];
  for (let declaration of declaration_.declarations) {
    if (declaration.init) {
      let i = getIdentifiersExpressionUses(declaration.init);
      identifiers.push(...i);
    }

    identifiers.push(
      ...getIdentifiersLValUses(declaration.id).map((access) => {
        if (access.type === "set") {
          return <IdentifierAccess>{
            type: "define",
            id: access.id,
          };
        } else {
          return access;
        }
      })
    );
  }
  return identifiers;
}
