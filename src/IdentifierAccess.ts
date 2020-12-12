import * as types from "@babel/types";

export type Identifiers = Set<string>;

export type IdentifierAccess_ = {
  get: Identifiers;
  set: Identifiers;
  define: Identifiers;
};

export function mergeIdentifiersOr(...list: Identifiers[]): Identifiers {
  let new_ = new Set<string>();

  // Add from each list
  for (let identifiers of list) {
    identifiers.forEach((id) => {
      new_.add(id);
    });
  }

  return new_;
}

export function mergeIdentifiersAnd(...list: Identifiers[]): Identifiers {
  let new_ = new Set<string>();
  if (list.length === 0) {
    return new_;
  }

  // Find the shortest set because it'll have the least bottleneck
  let indexOfShortest = 0;
  for (let i = 0; i < list.length; i++) {
    if (list[i].size < list[indexOfShortest].size) {
      indexOfShortest = i;
    }
  }

  list[indexOfShortest].forEach((id) => {
    for (let i = 0; i < list.length; i++) {
      if (list[i].has(id)) {
        new_.add(id);
      } else {
        break;
      }
    }
  });

  return new_;
}

export function concat(...list: IdentifierAccess_[]): IdentifierAccess_ {
  return {
    get: mergeIdentifiersOr(...list.map((id) => id.get)),
    set: mergeIdentifiersOr(...list.map((id) => id.set)),
    define: mergeIdentifiersOr(...list.map((id) => id.define)),
  };
}

export function mergeSequentialIdentifiers(
  ...list: IdentifierAccess_[]
): IdentifierAccess_ {
  return concat(...list);
}

export function identifiers(): Identifiers {
  return new Set<string>();
}

export function createIdentifierAccess(): IdentifierAccess_ {
  return {
    define: identifiers(),
    get: identifiers(),
    set: identifiers(),
  };
}
