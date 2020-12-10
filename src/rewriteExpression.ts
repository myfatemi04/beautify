import * as types from "@babel/types";
import { rewriteArrayExpression } from "./rewriteArrayExpression";
import { rewriteArrowFunctionExpression } from "./rewriteArrowFunctionExpression";
import { rewriteAssignmentExpression } from "./rewriteAssignmentExpression";
import { rewriteBinaryExpression } from "./rewriteBinaryExpression";
import { rewriteCallExpression } from "./rewriteCallExpression";
import { rewriteClassExpression } from "./rewriteClass";
import { rewriteConditionalExpression } from "./rewriteConditionalExpression";
import { rewriteFunctionExpression } from "./rewriteFunction";
import { rewriteLogicalExpression } from "./rewriteLogicalExpression";
import {
  rewriteMemberExpression,
  rewriteOptionalMemberExpression,
} from "./rewriteMemberExpression";
import { rewriteNewExpression } from "./rewriteNewExpression";
import { rewriteObjectExpression } from "./rewriteObject";
import { rewriteSequenceExpression } from "./rewriteSequenceExpression";
import { rewriteUnaryExpression } from "./rewriteUnaryExpression";
import { Scope } from "./scope";

export function rewriteExpression(
  expression: types.Expression,
  scope: Scope
): types.Expression {
  switch (expression.type) {
    case "ConditionalExpression":
      return rewriteConditionalExpression(expression, scope);
    case "UnaryExpression":
      return rewriteUnaryExpression(expression, scope);
    case "BinaryExpression":
      return rewriteBinaryExpression(expression, scope);
    case "SequenceExpression":
      return rewriteSequenceExpression(expression, scope);
    case "CallExpression":
      return rewriteCallExpression(expression, scope);
    case "AssignmentExpression":
      return rewriteAssignmentExpression(expression, scope);
    case "ObjectExpression":
      return rewriteObjectExpression(expression, scope);
    case "ArrayExpression":
      return rewriteArrayExpression(expression, scope);
    case "MemberExpression":
      return rewriteMemberExpression(expression, scope);
    case "OptionalMemberExpression":
      return rewriteOptionalMemberExpression(expression, scope);
    case "NewExpression":
      return rewriteNewExpression(expression, scope);
    case "LogicalExpression":
      return rewriteLogicalExpression(expression, scope);
    case "ParenthesizedExpression":
      return rewriteExpression(expression.expression, scope);
  }

  if (types.isLiteral(expression)) {
    return expression;
  }

  if (types.isClassExpression(expression)) {
    return rewriteClassExpression(expression, scope);
  }

  if (types.isArrowFunctionExpression(expression)) {
    return rewriteArrowFunctionExpression(expression, scope);
  }

  if (types.isFunctionExpression(expression)) {
    return rewriteFunctionExpression(expression, scope);
  }

  if (types.isUpdateExpression(expression)) {
    return expression;
  }

  if (
    expression.type === "Identifier" ||
    expression.type === "ThisExpression"
  ) {
    return expression;
  }

  if (types.isYieldExpression(expression)) {
    return types.yieldExpression(rewriteExpression(expression.argument, scope));
  }

  if (types.isAwaitExpression(expression)) {
    return types.awaitExpression(rewriteExpression(expression.argument, scope));
  }

  console.log("rewriteExpression() needs", expression);

  return expression;
}
