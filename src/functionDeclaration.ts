import * as types from "@babel/types";
import { rewriteScopedStatementArray } from "./statementArray";
import { PathNode } from "./path";
import { IdentifierAccess } from "./IdentifierAccess";
import { getIdentifiersFunctionParamsUse } from "./functionParams";
import { getIdentifiersStatementUses } from "./statement";

export function rewriteFunctionDeclaration(
  declaration: types.FunctionDeclaration,
  path: PathNode
): types.FunctionDeclaration {
  return types.functionDeclaration(
    declaration.id,
    declaration.params,
    types.blockStatement(
      rewriteScopedStatementArray(declaration.body.body, path)
    )
  );
}

export function getIdentifiersFunctionDeclarationUses(
  statement: types.FunctionDeclaration
): IdentifierAccess[] {
  return [
    ...getIdentifiersFunctionParamsUse(statement.params),
    ...getIdentifiersStatementUses(statement.body),
  ];
}
