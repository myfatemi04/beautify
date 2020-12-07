import * as types from "@babel/types";
import Preambleable, { addPreamble } from "./Preambleable";
import { rewriteExpression } from "./rewriteExpression";
import { Scope } from "./scope";

export function beautifyNegatedNumericLiteral(
  literal: types.NumericLiteral
): types.BooleanLiteral {
  return types.booleanLiteral(literal.value === 0);
}

export function rewriteNegatedUnaryExpressionArgument(
  argument: types.Expression,
  scope: Scope
): Preambleable<types.Expression> {
  if (argument.type === "NumericLiteral") {
    // Convert !0 to true, and !1 to false.
    return addPreamble(beautifyNegatedNumericLiteral(argument));
  } else if (argument.type === "CallExpression") {
    // Remove "!" before (function(){})()
    return rewriteExpression(argument, scope);
  } else {
    let { preamble, value } = rewriteExpression(argument, scope);
    return {
      preamble,
      value: types.unaryExpression("!", value),
    };
  }
}

export function rewriteUnaryExpression(
  expression: types.UnaryExpression,
  scope: Scope
): Preambleable<types.UnaryExpression | types.Expression> {
  if (expression.operator === "!") {
    return rewriteNegatedUnaryExpressionArgument(expression.argument, scope);
  } else if (expression.operator === "void") {
    if (expression.argument.type === "NumericLiteral") {
      if (expression.argument.value === 0) {
        return addPreamble(types.identifier("undefined"));
      }
    }
  }

  return addPreamble(expression);
}
