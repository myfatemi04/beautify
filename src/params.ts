import {
  Identifier,
  Pattern,
  RestElement,
  TSParameterProperty,
} from "@babel/types";

export type FunctionParam =
  | Identifier
  | Pattern
  | RestElement
  | TSParameterProperty;
