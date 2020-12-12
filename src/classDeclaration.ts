import * as types from "@babel/types";
import { rewriteClassBody } from "./classBody";
import { getIdentifiersClassMethodUses } from "./classMethod";
import { getIdentifiersExpressionUses } from "./expression";
import {
  concat,
  createIdentifierAccess,
  IdentifierAccess_,
} from "./IdentifierAccess";
import { PathNode } from "./path";

export function rewriteClassDeclaration(
  expression: types.ClassDeclaration,
  path: PathNode
): types.ClassDeclaration {
  return types.classDeclaration(
    expression.id,
    expression.superClass,
    rewriteClassBody(expression.body, path),
    expression.decorators
  );
}

export function getIdentifiersClassDeclarationUses(
  statement: types.ClassDeclaration
): IdentifierAccess_ {
  return concat(
    statement.superClass
      ? getIdentifiersExpressionUses(statement.superClass)
      : createIdentifierAccess(),
    ...statement.body.body.map((line) => {
      if (line.type === "TSDeclareMethod" || line.type === "TSIndexSignature") {
        return createIdentifierAccess();
      } else if (line.type === "ClassMethod") {
        return getIdentifiersClassMethodUses(line);
      } else if (line.type === "ClassPrivateMethod") {
        return getIdentifiersClassMethodUses(line);
      } else if (line.type === "ClassProperty") {
        if (line.value) {
          return getIdentifiersExpressionUses(line.value);
        } else {
          return createIdentifierAccess();
        }
      } else if (line.type === "ClassPrivateProperty") {
        if (line.value) {
          return getIdentifiersExpressionUses(line.value);
        } else {
          return createIdentifierAccess();
        }
      } else {
        throw new Error("Invalid class body line " + line);
      }
    })
  );
}
