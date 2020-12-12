import {
  IdentifierAccess_,
  mergeIdentifiersAnd,
  mergeIdentifiersOr,
} from "./IdentifierAccess";

export function mergeUncertainAccesses(
  a: IdentifierAccess_,
  b: IdentifierAccess_
): IdentifierAccess_ {
  return <IdentifierAccess_>{
    get: mergeIdentifiersOr(a.get, b.get),
    set: mergeIdentifiersAnd(a.set, b.set),
  };
}
