import * as types from "@babel/types";
import BASE_NODE from "./base_node";

export function toExpressionStatement(
  expression: types.Expression
): types.ExpressionStatement {
  return {
    ...BASE_NODE,
    type: "ExpressionStatement",
    expression,
  };
}