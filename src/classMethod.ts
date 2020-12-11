import * as types from "@babel/types";
import { getIdentifiersPatternLikeUses } from "./patternLike";
import { getIdentifiersAssignmentPatternUses } from "./pattern";
import { IdentifierAccess } from "./IdentifierAccess";
import { rewriteBlockStatement } from "./blockStatement";
import { Scope } from "./scope";

export function getIdentifiersClassMethodUses(
  method: types.ClassMethod | types.ClassPrivateMethod
): IdentifierAccess[] {
  let identifiers: IdentifierAccess[] = [];

  for (let param of method.params) {
    if (types.isPatternLike(param)) {
      identifiers.push(...getIdentifiersPatternLikeUses(param));
    } else if (param.type === "TSParameterProperty") {
      // TS Parameter [e.g. constructor(private a: string)]
      // The param can be an identifier or assignment pattern and is treated
      // like it were a regular function parameter.
      if (types.isIdentifier(param)) {
        identifiers.push({ type: "set", id: param });
      } else if (types.isAssignmentPattern(param)) {
        identifiers.push(...getIdentifiersAssignmentPatternUses(param));
      } else {
        throw new Error("Invalid TS Parameter Property: " + param);
      }
    }
  }

  return identifiers;
}

export function rewriteClassMethod(
  expression: types.ClassMethod | types.ClassPrivateMethod,
  scope: Scope
): types.ClassMethod | types.ClassPrivateMethod {
  return {
    ...expression,
    body: rewriteBlockStatement(expression.body, scope),
  };
}
