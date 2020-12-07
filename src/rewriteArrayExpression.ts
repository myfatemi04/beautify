import * as types from "@babel/types";
import Preambleable from "./Preambleable";
import { rewriteExpressionsAndConcat } from "./rewriteExpression";
import { Scope } from "./scope";
import { ArrayElement } from "./types";

export function rewriteArrayExpression(
  expression: types.ArrayExpression,
  scope: Scope
): Preambleable<types.ArrayExpression> {
  let preamble: types.Statement[] = [];
  let newElements: Array<ArrayElement> = [];

  for (let element of expression.elements) {
    if (element == null) {
      newElements.push(null);
    } else if (element.type === "SpreadElement") {
      newElements.push(element);
    } else {
      newElements.push(rewriteExpressionsAndConcat(element, scope, preamble));
    }
  }

  return {
    preamble,
    value: types.arrayExpression(newElements),
  };
}