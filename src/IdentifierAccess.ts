export type Identifiers = Set<string>;

export type IdentifierAccess_ = {
  get: Identifiers;
  set: Identifiers;
};

export function mergeIdentifiersOr(...list: Identifiers[]): Identifiers {
  let new_ = new Set<string>();
  if (list.length === 0) {
    return new_;
  }

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
    // define: mergeIdentifiersOr(...list.map((id) => id.define)),
  };
}

export function mergeSequentialIdentifiers(
  ...list: IdentifierAccess_[]
): IdentifierAccess_ {
  let new_ = createIdentifierAccess();
  if (list.length === 0) {
    return new_;
  }

  for (let access of list) {
    access.get.forEach((id) => {
      if (!new_.set.has(id)) {
        new_.get.add(id);
      }
    });

    access.set.forEach((id) => {
      if (!new_.get.has(id)) {
        new_.set.add(id);
      }
    });
  }

  return new_;
}

export function identifiers(): Identifiers {
  return new Set<string>();
}

export function createIdentifierAccess(): IdentifierAccess_ {
  return {
    get: identifiers(),
    set: identifiers(),
    // define: identifiers(),
  };
}
