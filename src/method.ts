import * as types from "@babel/types";
import { getIdentifiersExpressionUses } from "./expression";
import { getIdentifiersFunctionParamsUse } from "./functionParams";
import {
  concat,
  createIdentifierAccess,
  IdentifierAccess_,
} from "./IdentifierAccess";
import { removeDefinedIdentifiers } from "./removeDefinedIdentifiers";
import { getIdentifiersStatementUses } from "./statement";

export type Method =
  | types.ClassMethod
  | types.ClassPrivateMethod
  | types.ArrowFunctionExpression
  | types.FunctionDeclaration
  | types.FunctionExpression
  | types.ObjectMethod;

export function getIdentifiersMethodUses(method: Method): IdentifierAccess_ {
  let identifiers: IdentifierAccess_ = createIdentifierAccess();
  identifiers = concat(
    identifiers,
    getIdentifiersFunctionParamsUse(method.params)
  );

  if (types.isBlockStatement(method.body)) {
    identifiers = concat(identifiers, getIdentifiersStatementUses(method.body));
  } else {
    identifiers = concat(
      identifiers,
      getIdentifiersExpressionUses(method.body)
    );
  }

  // now, any identifiers that say "define", we must remove subsequent references

  // find all identifiers that say "define"
  return removeDefinedIdentifiers(identifiers);
}
