import * as types from "@babel/types";
import { getIdentifiersExpressionUses, rewriteExpression } from "./expression";
import { getIdentifiersPrivateNameUses } from "./privateName";
import {
  concat,
  createIdentifierAccess,
  IdentifierAccess_,
} from "./IdentifierAccess";
import hasSpecialCharacters from "./hasSpecialCharacters";
import { PathNode } from "./path";

export function getIdentifiersMemberExpressionUses(
  expression: types.MemberExpression
): IdentifierAccess_ {
  let identifiers: IdentifierAccess_ = createIdentifierAccess();

  identifiers = concat(
    identifiers,
    getIdentifiersExpressionUses(expression.object)
  );

  if (expression.computed) {
    if (types.isPrivateName(expression.property)) {
      identifiers = concat(
        identifiers,
        getIdentifiersPrivateNameUses(expression.property)
      );
    } else {
      identifiers = concat(
        identifiers,
        getIdentifiersExpressionUses(expression.property)
      );
    }
  } else {
    // don't do anything if not computed
  }

  return identifiers;
}

/**
 * When given an expression like A.B, rewrite the base member.
 * @param expression Member expression to rewrite
 */
export function rewriteMemberExpression(
  expression: types.MemberExpression,
  path: PathNode
): types.MemberExpression {
  let object = rewriteExpression(expression.object, path);
  let property = expression.property;
  if (expression.property.type !== "PrivateName") {
    property = rewriteExpression(expression.property, path);
  }

  let computed = expression.computed;
  // Rewrite things like a["b"] to a.b
  if (property.type === "StringLiteral") {
    if (!hasSpecialCharacters(property.value)) {
      property = types.identifier(property.value);
      computed = false;
    }
  }

  return types.memberExpression(
    object,
    property,
    computed,
    expression.optional
  );
}

export function rewriteOptionalMemberExpression(
  expression: types.OptionalMemberExpression,
  path: PathNode
): types.OptionalMemberExpression {
  let object = rewriteExpression(expression.object, path);
  let property = rewriteExpression(expression.property, path);

  return types.optionalMemberExpression(
    object,
    property,
    expression.computed,
    expression.optional
  );
}
