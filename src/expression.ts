import * as types from "@babel/types";
import { combine } from "./combine";
import { getIdentifiersFunctionParamsUse } from "./functionParams";
import { getIdentifiersLValUses } from "./lval";
import { getIdentifiersMemberExpressionUses } from "./memberExpression";
import { getIdentifiersObjectPropertyUses } from "./objectProperty";
import { getIdentifiersPrivateNameUses } from "./privateName";
import { getIdentifiersStatementUses } from "./statement";
import { getIdentifiersCalleeUses } from "./callee";
import { IdentifierAccess } from "./IdentifierAccess";
import {
  getIdentifiersArrayExpressionUses,
  rewriteArrayExpression,
} from "./arrayExpression";
import { rewriteArrowFunctionExpression } from "./arrowFunctionExpression";
import {
  getIdentifiersAssignmentExpressionUses,
  rewriteAssignmentExpression,
} from "./assignmentExpression";
import { rewriteBinaryExpression } from "./binaryExpression";
import { rewriteCallExpression } from "./callExpression";
import { rewriteClassExpression } from "./classExpression";
import { rewriteConditionalExpression } from "./conditionalExpression";
import { rewriteFunctionExpression } from "./functionExpression";
import { rewriteLogicalExpression } from "./logicalExpression";
import {
  rewriteMemberExpression,
  rewriteOptionalMemberExpression,
} from "./memberExpression";
import { rewriteNewExpression } from "./newExpression";
import {
  getIdentifiersObjectExpressionUses,
  rewriteObjectExpression,
} from "./objectExpression";
import {
  getIdentifiersSequenceExpressionUses,
  rewriteSequenceExpression,
} from "./sequenceExpression";
import { rewriteUnaryExpression } from "./unaryExpression";
import { PathNode } from "./path";
import { getIdentifiersArgumentsUse } from "./arguments";
import { getIdentifiersMethodUses } from "./method";
import { getIdentifiersClassBodyUses } from "./classBody";

export function getIdentifiersExpressionUses(
  expression: types.Expression
): IdentifierAccess[] {
  switch (expression.type) {
    case "UnaryExpression":
    case "UpdateExpression":
      return getIdentifiersExpressionUses(expression.argument);

    case "SequenceExpression":
      return getIdentifiersSequenceExpressionUses(expression);

    case "Identifier":
      return [{ type: "get", id: expression }];

    case "ConditionalExpression":
      return [
        ...getIdentifiersExpressionUses(expression.test),
        ...getIdentifiersExpressionUses(expression.consequent),
        ...getIdentifiersExpressionUses(expression.alternate),
      ];

    case "BinaryExpression":
    case "LogicalExpression": {
      let identifiers = [];
      if (types.isPrivateName(expression.left)) {
        identifiers.push(...getIdentifiersPrivateNameUses(expression.left));
      } else {
        identifiers.push(...getIdentifiersExpressionUses(expression.left));
      }

      identifiers.push(...getIdentifiersExpressionUses(expression.right));

      return identifiers;
    }

    case "CallExpression":
    case "NewExpression":
      return [
        ...getIdentifiersCalleeUses(expression.callee),
        ...getIdentifiersArgumentsUse(expression.arguments),
      ];

    case "ArrayExpression":
      return getIdentifiersArrayExpressionUses(expression);

    case "ObjectExpression":
      return getIdentifiersObjectExpressionUses(expression);

    case "AssignmentExpression":
      return getIdentifiersAssignmentExpressionUses(expression);

    case "MemberExpression":
      return getIdentifiersMemberExpressionUses(expression);

    case "AwaitExpression":
    case "YieldExpression":
      return getIdentifiersExpressionUses(expression.argument);

    case "BooleanLiteral":
    case "StringLiteral":
    case "BigIntLiteral":
    case "NumericLiteral":
    case "RegExpLiteral":
    case "DecimalLiteral":
    case "NullLiteral":
    case "ThisExpression":
    case "Super":
      return [];

    case "ClassExpression":
      return getIdentifiersClassBodyUses(expression.body);

    case "ArrowFunctionExpression":
    case "FunctionExpression":
      return getIdentifiersMethodUses(expression);
  }

  console.warn("getIdentifiersExpressionUses() needs case", expression);

  return [];
}

export function rewriteExpression(
  expression: types.Expression,
  path: PathNode
): types.Expression {
  switch (expression.type) {
    case "ConditionalExpression":
      return rewriteConditionalExpression(expression, path);
    case "UnaryExpression":
      return rewriteUnaryExpression(expression, path);
    case "BinaryExpression":
      return rewriteBinaryExpression(expression, path);
    case "SequenceExpression":
      return rewriteSequenceExpression(expression, path);
    case "CallExpression":
      return rewriteCallExpression(expression, path);
    case "AssignmentExpression":
      return rewriteAssignmentExpression(expression, path);
    case "ObjectExpression":
      return rewriteObjectExpression(expression, path);
    case "ArrayExpression":
      return rewriteArrayExpression(expression, path);
    case "MemberExpression":
      return rewriteMemberExpression(expression, path);
    case "OptionalMemberExpression":
      return rewriteOptionalMemberExpression(expression, path);
    case "NewExpression":
      return rewriteNewExpression(expression, path);
    case "LogicalExpression":
      return rewriteLogicalExpression(expression, path);
    case "ParenthesizedExpression":
      return rewriteExpression(expression.expression, path);
    case "Super":
      return expression;
  }

  if (types.isLiteral(expression)) {
    return expression;
  }

  if (types.isClassExpression(expression)) {
    return rewriteClassExpression(expression, path);
  }

  if (types.isArrowFunctionExpression(expression)) {
    return rewriteArrowFunctionExpression(expression, path);
  }

  if (types.isFunctionExpression(expression)) {
    return rewriteFunctionExpression(expression, path);
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
    return types.yieldExpression(rewriteExpression(expression.argument, path));
  }

  if (types.isAwaitExpression(expression)) {
    return types.awaitExpression(rewriteExpression(expression.argument, path));
  }

  console.log("rewriteExpression() needs", expression);

  return expression;
}
