import * as types from "@babel/types";
import { rewriteExpression } from "./expression";
import { PathNode } from "./path";

/**
 * When given an expression using ==, ===, !==, !=, >, <, >=, <=, etc,
 * rewrite both sides of the expression (it's safe, both sides get calculated.)
 * @param expression Binary expression to rewrite
 */
export function rewriteBinaryExpression(
  expression: types.BinaryExpression,
  path: PathNode
): types.BinaryExpression {
  let { left, right, operator } = expression;

  if (!types.isPrivateName(left)) {
    left = rewriteExpression(left, path);
  }

  right = rewriteExpression(right, path);

  return types.binaryExpression(operator, left, right);
}
