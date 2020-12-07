import * as t from "@babel/types";

export function getAllIdentifiers(pattern: t.PatternLike) {
  switch (pattern.type) {
    case "Identifier":
      return [pattern];
    case "ArrayPattern":
      return Array.prototype.concat(
        ...pattern.elements.map((element) => {
          return getAllIdentifiers(element);
        })
      );
    case "ObjectPattern":
      return Array.prototype.concat(
        pattern.properties.map((property) => {
          if (t.isObjectProperty(property)) {
            if (t.isPatternLike(property.value)) {
              return getAllIdentifiers(property.value);
            } else {
              return [];
            }
          } else {
            return getAllIdentifiers(property);
          }
        })
      );
    case "RestElement":
      if (
        !t.isMemberExpression(pattern.argument) &&
        !t.isTSParameterProperty(pattern.argument)
      ) {
        return getAllIdentifiers(pattern.argument);
      }
  }

  return [];
}

export function getAllDeclaredIdentifiers(declaration: t.VariableDeclaration) {
  let identifiers = [];
  for (let declarator of declaration.declarations) {
    if (
      !t.isMemberExpression(declarator.id) &&
      !t.isTSParameterProperty(declarator.id)
    ) {
      identifiers = identifiers.concat(getAllIdentifiers(declarator.id));
    }
  }

  return identifiers;
}

export function expandVariableDeclarator(declarator: t.VariableDeclarator) {
  let id = declarator.id;
  let init = declarator.init;

  let assignments = [{ init: declarator.init }];

  const initIdentifier = t.identifier("init");

  let { a, b, ...c } = { a: 1, b: 2, c: 3, d: 4 };
}

export function expandPatternLike(
  patternLike: t.PatternLike,
  base: t.Expression
) {
  switch (patternLike.type) {
    case "ArrayPattern":
      return expandArrayPattern(patternLike, base);
    case "Identifier":
      return expandIdentifier(patternLike, base);
    case "ObjectPattern":
      return expandObjectPattern(patternLike, base);
  }
}

export function expandObjectPattern(
  objectPattern: t.ObjectPattern,
  base: t.Expression
) {
  let assignments = [];
  objectPattern.properties.forEach((property) => {
    if (property.type === "RestElement") {
    } else {
      property.key;
    }
  });
}

export function expandIdentifier(identifier: t.Identifier, base: t.Expression) {
  return [{ [identifier.name]: base }];
}

export function expandArrayPattern(
  arrayPattern: t.ArrayPattern,
  base: t.Expression
) {
  let assignments = [];
  for (let i = 0; i < arrayPattern.elements.length; i++) {
    let base_ = t.memberExpression(base, t.numericLiteral(i));
    assignments = assignments.concat(
      expandPatternLike(arrayPattern.elements[i], base_)
    );
  }

  return assignments;
}
