import * as types from "@babel/types";
import { Identifier } from "./Expression";
import { Pattern } from "./Pattern";

export class RestElement {
  constructor(public argument: Pattern) {}
}

export function parameterFromBabel(
  babel:
    | types.Identifier
    | types.Pattern
    | types.RestElement
    | types.TSParameterProperty
) {
  if (types.isIdentifier(babel)) {
    return new Identifier(babel.name);
  } else if (types.isPattern(babel)) {
    return Pattern.fromBabel(babel);
  } else if (types.isRestElement(babel)) {
    return new RestElement(babel.argument);
  }
}

export type Parameter = Identifier | RestElement | Pattern;
