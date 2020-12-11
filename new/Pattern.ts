import * as types from "@babel/types";
import { Expression, Identifier } from "./Expression";
import { RestElement } from "./Parameter";

interface ObjectPatternProperty {
  key: Identifier;
  value: PatternValue;
}

export type PatternValue = Pattern | Identifier | RestElement;

export function patternLikeToPatternValue(patternLike: types.PatternLike) {
  if (patternLike.type === "Identifier") {
    return new Identifier(patternLike.name);
  }
  if (patternLike.type === "RestElement") {
    return new RestElement(Expression.fromBabel(patternLike.argument));
  }
  return Pattern.fromBabel(patternLike);
}

export class Pattern {
  static fromBabel(babel: types.Pattern) {
    if (types.isArrayPattern(babel)) {
      return new ArrayPattern(babel.elements.map(patternLikeToPatternValue));
    }
  }
}

export class ArrayPattern extends Pattern {
  constructor(public elements: PatternValue[]) {
    super();
  }
}

export class ObjectPattern extends Pattern {
  constructor(public properties: ObjectPatternProperty[]) {
    super();
  }
}
