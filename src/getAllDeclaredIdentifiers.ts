import * as t from "@babel/types";

export function getAllIdentifiers(pattern: t.PatternLike): t.Identifier[] {
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

export function getAllDeclaredIdentifiers(
  declaration: t.VariableDeclaration
): t.Identifier[] {
  let identifiers: t.Identifier[] = [];
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


