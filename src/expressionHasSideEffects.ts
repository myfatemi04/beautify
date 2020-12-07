import * as types from "@babel/types";

export default function expressionHasSideEffects(
  expression: types.Expression
): boolean {
  if (types.isMemberExpression(expression)) {
    // it might call a "get" method, who knows
    return true;
  }

  if (types.isIdentifier(expression)) {
    return false;
  }

  if (types.isLiteral(expression)) {
    // ok this might have side effects, idk
    if (expression.type === "StringLiteral") {
      if (expression.value === "use strict") {
        return true;
      }
    }

    // but otherwise nahhh
    return false;
  }

  if (types.isArrayExpression(expression)) {
    for (let element of expression.elements) {
      if (element.type !== "SpreadElement") {
        if (expressionHasSideEffects(element)) {
          return true;
        }
      }
    }

    return false;
  }

  if (types.isObjectExpression(expression)) {
    for (let property of expression.properties) {
      // these don't have side effects, so we check if
      // the property is NOT one of those
      if (
        property.type !== "SpreadElement" &&
        property.type !== "ObjectMethod"
      ) {
        if (expressionHasSideEffects(property.key)) {
          return true;
        }

        if (types.isPatternLike(property.value)) {
          // todo check this later
          // i have no idea wtf patterns are and if they have side effects
          return true;
        }

        if (expressionHasSideEffects(property.value)) {
          return true;
        }
      }
    }
  }

  return true;
}
