import * as types from "@babel/types";
import hasSpecialCharacters from "./hasSpecialCharacters";
import { rewriteExpression } from "./rewriteExpression";
import { Scope } from "./scope";

/**
 * When given an expression like A.B, rewrite the base member.
 * @param expression Member expression to rewrite
 */
export function rewriteMemberExpression(
  expression: types.MemberExpression,
  scope: Scope
): types.MemberExpression {
  let object = rewriteExpression(expression.object, scope);
  let property = expression.property;
  if (expression.property.type !== "PrivateName") {
    property = rewriteExpression(expression.property, scope);
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
  scope: Scope
): types.OptionalMemberExpression {
  let object = rewriteExpression(expression.object, scope);
  let property = rewriteExpression(expression.property, scope);

  return types.optionalMemberExpression(
    object,
    property,
    expression.computed,
    expression.optional
  );
}
