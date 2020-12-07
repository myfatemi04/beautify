import * as types from "@babel/types";
import Preambleable from "./Preambleable";
import { rewriteIfStatement } from "./rewriteIfStatement";
import { Scope } from "./scope";

export function createIfStatement(
  test: types.Expression,
  consequent: types.Statement,
  alternate: types.Statement,
  scope: Scope
): Preambleable<types.IfStatement> {
  return rewriteIfStatement(
    types.ifStatement(test, consequent, alternate),
    scope
  );
}
