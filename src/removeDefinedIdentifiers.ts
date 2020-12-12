import { createIdentifierAccess, IdentifierAccess_ } from "./IdentifierAccess";

export function removeDefinedIdentifiers(
  identifiers: IdentifierAccess_
): IdentifierAccess_ {
  return {
    ...identifiers,
    define: new Set<string>(),
  };
}
