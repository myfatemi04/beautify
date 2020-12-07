import * as types from "@babel/types";
import { createIdentifier } from "./create";

export function expandVariableDeclarator(declarator: types.VariableDeclarator) {
  let id = declarator.id;
  let init = declarator.init;

  let assignments = [{ init: declarator.init }];

  const initIdentifier = createIdentifier("init");

  let [a, b, c] = [1, 2, 3];
}

export function expandArrayPattern(
  arrayPattern: types.ArrayPattern,
  base: types.Expression
) {
  let assignments = [];
  for (let i = 0; i < arrayPattern.elements.length; i++) {
		types.memberExpression(base, types.numericLiteral(i));
  }
}
