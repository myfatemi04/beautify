import * as types from "@babel/types";
import hasSpecialCharacters from "./hasSpecialCharacters";
import Preambleable from "./Preambleable";
import { rewriteExpressionsAndConcat } from "./rewriteExpression";
import { Scope } from "./scope";

/**
 * When given an expression like A.B, rewrite the base member.
 * @param expression Member expression to rewrite
 */
export function rewriteMemberExpression(
  expression: types.MemberExpression,
  scope: Scope
): Preambleable<types.MemberExpression> {
  let preamble = [];
  let object = rewriteExpressionsAndConcat(expression.object, scope, preamble);
  let property = expression.property;
  if (expression.property.type !== "PrivateName") {
    property = rewriteExpressionsAndConcat(expression.property, scope, preamble);
  }

  let computed = expression.computed;
  // Rewrite things like a["b"] to a.b
  if (property.type === "StringLiteral") {
    if (!hasSpecialCharacters(property.value)) {
      property = types.identifier(property.value);
      computed = false;
    }
  }

  return {
    preamble,
    value: types.memberExpression(
      object,
      property,
      computed,
      expression.optional
    ),
  };
}

export function rewriteOptionalMemberExpression(
  expression: types.OptionalMemberExpression,
  scope: Scope
): Preambleable<types.OptionalMemberExpression> {
  let preamble = [];
  let object = rewriteExpressionsAndConcat(expression.object, scope, preamble);
  let property = rewriteExpressionsAndConcat(expression.property, scope, preamble);

  return {
    preamble,
    value: types.optionalMemberExpression(
      object,
      property,
      expression.computed,
      expression.optional
    ),
  };
}