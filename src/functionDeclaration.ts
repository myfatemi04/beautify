import * as types from "@babel/types";
import { PathNode } from "./path";
import { IdentifierAccess } from "./IdentifierAccess";
import { getIdentifiersMethodUses } from "./method";

export function rewriteFunctionDeclaration(
  declaration: types.FunctionDeclaration,
  path: PathNode
): types.FunctionDeclaration {
  let rewriter = new PathNode(declaration.body.body, true, path);
  rewriter.rewrite();

  return types.functionDeclaration(
    declaration.id,
    declaration.params,
    types.blockStatement(rewriter.body)
  );
}

export function getIdentifiersFunctionDeclarationUses(
  statement: types.FunctionDeclaration
): IdentifierAccess[] {
  return getIdentifiersMethodUses(statement);
}
