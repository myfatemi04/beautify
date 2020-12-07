import * as types from "@babel/types";

export default function negateExpression(
  expression: types.Expression
): types.Expression {
  switch (expression.type) {
    case "LogicalExpression":
      if (expression.operator === "&&") {
        return types.logicalExpression(
          "||",
          negateExpression(expression.left),
          negateExpression(expression.right)
        );
      } else if (expression.operator === "||") {
        return types.logicalExpression(
          "&&",
          negateExpression(expression.left),
          negateExpression(expression.right)
        );
      }
    case "UnaryExpression":
      if (expression.operator === "!") {
        // If a negated expression, un-negate the expression
        return expression.argument;
      } else {
        break;
      }
    case "BinaryExpression": {
      let changes = {
        ["!="]: "==",
        ["!=="]: "==",
        ["=="]: "!=",
        ["==="]: "!==",
        [">="]: "<=",
        [">"]: "<",
        ["<="]: ">=",
        ["<"]: ">",
      };

      if (expression.operator in changes) {
        return types.binaryExpression(
          changes[expression.operator],
          expression.left,
          expression.right
        );
      }

      break;
    }
  }

  // Return a regular negated expression
  return types.unaryExpression("!", expression);
}
