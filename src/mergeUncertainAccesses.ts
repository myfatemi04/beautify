import { createIdentifierAccess, IdentifierAccess_ } from "./IdentifierAccess";

export function mergeUncertainAccesses(
  a: IdentifierAccess_,
  b: IdentifierAccess_
): IdentifierAccess_ {
  let identifiers = createIdentifierAccess();

  // If either side used the value, the value is guaranteed to be meaningful
  a.get.forEach((id) => {
    identifiers.get.add(id);
  });

  b.get.forEach((id) => {
    identifiers.get.add(id);
  });

  // If both sides overwrote the value, the value is guaranteed to be meaningless
  // If only one side does though, the other side might use it
  a.set.forEach((id) => {
    if (b.set.has(id)) {
      if (!identifiers.get.has(id)) {
        identifiers.set.add(id);
      }
    }
  });

  return identifiers;
}
