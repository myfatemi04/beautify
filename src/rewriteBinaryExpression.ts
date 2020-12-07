import * as types from "@babel/types";
import Preambleable from "./Preambleable";
import { rewriteExpressionsAndConcat } from "./rewriteExpression";
import { Scope } from "./scope";

/**
 * When given an expression using ==, ===, !==, !=, >, <, >=, <=, etc,
 * rewrite both sides of the expression (it's safe, both sides get calculated.)
 * @param expression Binary expression to rewrite
 */
export function rewriteBinaryExpression(
  expression: types.BinaryExpression,
  scope: Scope
): Preambleable<types.BinaryExpression> {
  let preamble = [];
  let { left, right, operator } = expression;

  if (left.type !== "PrivateName")
    left = rewriteExpressionsAndConcat(left, scope, preamble);

  right = rewriteExpressionsAndConcat(right, scope, preamble);

  return {
    preamble,
    value: types.binaryExpression(operator, left, right),
  };
}