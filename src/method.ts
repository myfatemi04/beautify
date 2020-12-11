import * as types from "@babel/types";
import { getIdentifiersExpressionUses } from "./expression";
import { getIdentifiersFunctionParamsUse } from "./functionParams";
import { IdentifierAccess } from "./IdentifierAccess";
import { removeDefinedIdentifiers } from "./removeDefinedIdentifiers";
import { getIdentifiersStatementUses } from "./statement";

export type Method =
  | types.ClassMethod
  | types.ClassPrivateMethod
  | types.ArrowFunctionExpression
  | types.FunctionDeclaration
  | types.FunctionExpression
  | types.ObjectMethod;

export function getIdentifiersMethodUses(method: Method): IdentifierAccess[] {
  let identifiers: IdentifierAccess[] = [];
  identifiers.push(...getIdentifiersFunctionParamsUse(method.params));

  if (types.isBlockStatement(method.body)) {
    identifiers.push(...getIdentifiersStatementUses(method.body));
  } else {
    identifiers.push(...getIdentifiersExpressionUses(method.body));
  }

  // now, any identifiers that say "define", we must remove subsequent references

  // find all identifiers that say "define"
  return removeDefinedIdentifiers(identifiers);
}
