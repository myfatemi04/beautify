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
import { rewriteSequenceExpression } from "./sequenceExpression";
import { rewriteUnaryExpression } from "./unaryExpression";
import { Scope } from "./scope";

export function getIdentifiersExpressionsUse(
  expressions: (
    | types.Expression
    | types.SpreadElement
    | types.JSXNamespacedName
    | types.ArgumentPlaceholder
  )[]
): IdentifierAccess[] {
  let identifiers: IdentifierAccess[][] = expressions.map((element) => {
    if (element == null) {
      return [];
    }

    if (element.type !== "ArgumentPlaceholder") {
      return getIdentifiersExpressionUses(element);
    } else {
      return [];
    }
  });

  return [].concat(...identifiers);
}

export function getIdentifiersExpressionUses(
  expression: types.Expression | types.SpreadElement | types.JSXNamespacedName
): IdentifierAccess[] {
  switch (expression.type) {
    case "SpreadElement":
    case "UnaryExpression":
      return getIdentifiersExpressionUses(expression.argument);

    case "UpdateExpression":
      if (expression.argument.type === "Identifier") {
        return [
          { type: "get", id: expression.argument },
          { type: "set", id: expression.argument },
        ];
      } else {
        return getIdentifiersExpressionUses(expression.argument);
      }

    case "SequenceExpression":
      return getIdentifiersExpressionsUse(expression.expressions);

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
        ...getIdentifiersExpressionsUse(expression.arguments),
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
      return [];

    case "ArrowFunctionExpression":
    case "FunctionExpression": {
      // TODO make this better-suited for scope changes
      let identifiers: IdentifierAccess[] = [];

      identifiers.push(...getIdentifiersFunctionParamsUse(expression.params));

      if (types.isExpression(expression.body)) {
        identifiers.push(...getIdentifiersExpressionUses(expression.body));
      } else if (types.isStatement(expression.body)) {
        identifiers.push(...getIdentifiersStatementUses(expression.body));
      }

      return identifiers;
    }
  }

  console.warn("getIdentifiersExpressionUses() needs case", expression);

  return [];
}

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
