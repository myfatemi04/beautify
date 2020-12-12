import * as types from "@babel/types";
import { getIdentifiersExpressionUses } from "./expression";
import { getIdentifiersFunctionParamsUse } from "./functionParams";
import {
  concat,
  createIdentifierAccess,
  IdentifierAccess_,
  mergeIdentifiersOr,
  mergeSequentialIdentifiers,
} from "./IdentifierAccess";
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
  let defined = new Set<string>();

  let paramsUsed = getIdentifiersFunctionParamsUse(method.params);

  // if the value was retrieved before being set, add it to 'get'
  identifiers.get = mergeIdentifiersOr(identifiers.get, paramsUsed.get);
  // now, add all variables that were defined
  paramsUsed.set.forEach((id) => {
    defined.add(id);
  });

  let used: IdentifierAccess_;
  if (types.isBlockStatement(method.body)) {
    used = getIdentifiersStatementUses(method.body);
  } else {
    used = getIdentifiersExpressionUses(method.body);
  }

  used.get.forEach((id) => {
    if (!defined.has(id)) {
      identifiers.get.add(id);
    }
  });

  used.set.forEach((id) => {
    if (!defined.has(id)) {
      identifiers.set.add(id);
    }
  });

  return identifiers;
}
