import * as types from "@babel/types";
import Preambleable from "./Preambleable";
import { rewriteExpression } from "./rewriteExpression";
import { Scope } from "./scope";

export function rewriteSpreadElement(
  spreadElement: types.SpreadElement,
  scope: Scope
): Preambleable<types.SpreadElement> {
  let { preamble, value } = rewriteExpression(spreadElement.argument, scope);
  return {
    preamble,
    value: types.spreadElement(value),
  };
}