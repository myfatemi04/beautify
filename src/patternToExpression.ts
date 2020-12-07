import * as types from "@babel/types";

export function patternToExpression(pattern: types.Pattern) {
  if (pattern.type === "ObjectPattern") {
    return objectPatternToExpression(pattern);
  } else if (pattern.type === "ArrayPattern") {
    return arrayPatternToExpression(pattern);
  } else if (pattern.type === "AssignmentPattern") {
    return assignmentPatternToExpression(pattern);
  }
}

export function lvalToExpressionOrSpreadElement(
  lval: types.LVal
): types.Expression | types.SpreadElement {
  if (types.isPattern(lval)) {
    return patternToExpression(lval);
  } else if (types.isExpression(lval)) {
    return lval;
  } else if (lval.type === "RestElement") {
    let exp = lvalToExpressionOrSpreadElement(lval.argument);
    if (exp.type !== "SpreadElement") {
      return types.spreadElement(exp);
    } else {
      /// what the fuckkkk
      console.error("Found spread element in spread element?", exp);
    }
  }
}

export function assignmentPatternToExpression(
  pattern: types.AssignmentPattern
): types.AssignmentExpression {
  let left: types.LVal = pattern.left;
  let right: types.Expression = pattern.right;

  return types.assignmentExpression("=", left, right);
}

export function arrayPatternToExpression(
  pattern: types.ArrayPattern
): types.ArrayExpression {
  return types.arrayExpression(
    pattern.elements.map((element) => {
      if (element.type === "Identifier") {
        return element;
      } else if (element.type === "RestElement") {
        if (types.isPattern(element.argument)) {
          return types.spreadElement(patternToExpression(element.argument));
        } else if (types.isExpression(element.argument)) {
          return element.argument;
        } else if (element.type === "RestElement") {
          throw new Error("RestElement within RestElement");
        }
      } else {
        return patternToExpression(element);
      }
    })
  );
}

export function objectPatternToExpression(
  pattern: types.ObjectPattern
): types.ObjectExpression {
  return types.objectExpression(
    pattern.properties.map((property) => {
      if (property.type === "RestElement") {
        if (types.isPattern(property.argument)) {
          return types.spreadElement(patternToExpression(property.argument));
        } else if (types.isExpression(property.argument)) {
          return types.spreadElement(property.argument);
        } else if (property.type === "RestElement") {
          throw new Error("RestElement within RestElement");
        }
      } else {
        return types.objectProperty(property.key, property.value);
      }
    })
  );
}