import * as types from "@babel/types";
import { rewriteExpression } from "./rewriteExpression";
import { Scope } from "./scope";

/**
 * When given an expression using ==, ===, !==, !=, >, <, >=, <=, etc,
 * rewrite both sides of the expression (it's safe, both sides get calculated.)
 * @param expression Binary expression to rewrite
 */
export function rewriteBinaryExpression(
  expression: types.BinaryExpression,
  scope: Scope
): types.BinaryExpression {
  let { left, right, operator } = expression;

  if (left.type !== "PrivateName") {
    left = rewriteExpression(left, scope);
  }

  right = rewriteExpression(right, scope);

  return types.binaryExpression(operator, left, right);
}
