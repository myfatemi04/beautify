import * as types from "@babel/types";

export type ArrayElement =
  | types.Expression
  | types.SpreadElement
  | types.NullLiteral;
