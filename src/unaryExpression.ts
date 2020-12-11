import * as types from "@babel/types";
import { rewriteExpression } from "./expression";
import { PathNode } from "./path";

export function beautifyNegatedNumericLiteral(
  literal: types.NumericLiteral
): types.BooleanLiteral {
  return types.booleanLiteral(literal.value === 0);
}

export function rewriteNegatedUnaryExpressionArgument(
  argument: types.Expression,
  path: PathNode
): types.Expression {
  if (argument.type === "NumericLiteral") {
    // Convert !0 to true, and !1 to false.
    return beautifyNegatedNumericLiteral(argument);
  } else if (argument.type === "CallExpression") {
    // Remove "!" before (function(){})()
    return rewriteExpression(argument, path);
  } else {
    return types.unaryExpression("!", rewriteExpression(argument, path));
  }
}

export function rewriteUnaryExpression(
  expression: types.UnaryExpression,
  path: PathNode
): types.UnaryExpression | types.Expression {
  if (expression.operator === "!") {
    return rewriteNegatedUnaryExpressionArgument(expression.argument, path);
  } else if (expression.operator === "void") {
    return types.identifier("undefined");
  }

  return expression;
}
