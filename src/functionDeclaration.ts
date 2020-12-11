import * as types from "@babel/types";
import { rewriteScopedStatementArray } from "./statementArray";
import { Scope } from "./scope";
import { IdentifierAccess } from "./IdentifierAccess";
import { getIdentifiersFunctionParamsUse } from "./functionParams";
import { getIdentifiersStatementUses } from "./statement";

export function rewriteFunctionDeclaration(
  declaration: types.FunctionDeclaration,
  scope: Scope
): types.FunctionDeclaration {
  return types.functionDeclaration(
    declaration.id,
    declaration.params,
    types.blockStatement(
      rewriteScopedStatementArray(declaration.body.body, scope)
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
