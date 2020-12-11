import { IdentifierAccess } from "./IdentifierAccess";

export function removeDefinedIdentifiers(
  identifiers: IdentifierAccess[]
): IdentifierAccess[] {
  let definedIdentifiers = {};
  let newIdentifiers: IdentifierAccess[] = [];
  for (let access of identifiers) {
    if (!definedIdentifiers[access.id.name]) {
      if (access.type === "define") {
        definedIdentifiers[access.id.name] = true;
      } else {
        newIdentifiers.push(access);
      }
    }
  }

  return newIdentifiers;
}
