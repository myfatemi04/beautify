import * as types from "@babel/types";
import { PathNode } from "./path";
import { IdentifierAccess_ } from "./IdentifierAccess";
import { getIdentifiersMethodUses } from "./method";
import { getIdentifiersFunctionParamsUse } from "./functionParams";

export function rewriteFunctionDeclaration(
  declaration: types.FunctionDeclaration,
  path: PathNode
): types.FunctionDeclaration {
  let definedVars = getIdentifiersFunctionParamsUse(declaration.params);
  let rewriter = new PathNode(
    declaration.body.body,
    true,
    path,
    definedVars.set
  );
  rewriter.rewrite();

  return types.functionDeclaration(
    declaration.id,
    declaration.params,
    types.blockStatement(rewriter.body)
  );
}

export function getIdentifiersFunctionDeclarationUses(
  statement: types.FunctionDeclaration
): IdentifierAccess_ {
  return getIdentifiersMethodUses(statement);
}
