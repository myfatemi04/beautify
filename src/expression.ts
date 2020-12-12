import * as types from "@babel/types";
import generate from "@babel/generator";
import { getIdentifiersMemberExpressionUses } from "./memberExpression";
import { getIdentifiersPrivateNameUses } from "./privateName";
import { getIdentifiersCalleeUses } from "./callee";
import {
  concat,
  createIdentifierAccess,
  IdentifierAccess_,
} from "./IdentifierAccess";
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
import { mergeUncertainAccesses } from "./mergeUncertainAccesses";

export function getIdentifiersExpressionUses(
  expression: types.Expression
): IdentifierAccess_ {
  let identifiers = createIdentifierAccess();
  switch (expression.type) {
    case "UnaryExpression":
      return getIdentifiersExpressionUses(expression.argument);

    case "UpdateExpression":
      if (expression.argument.type === "Identifier") {
        identifiers.set.add(expression.argument.name);
        return identifiers;
      } else if (expression.argument.type === "MemberExpression") {
        return getIdentifiersMemberExpressionUses(expression.argument);
      } else {
        throw new Error(
          "Invalid update exception argument: " + expression.argument
        );
      }

    case "SequenceExpression":
      return getIdentifiersSequenceExpressionUses(expression);

    case "Identifier":
      identifiers.get.add(expression.name);
      return identifiers;
    // throw new Error(
    //   "getIdentifiersExpressionUses() called on identifier " +
    //     generate(expression).code
    // );

    case "ConditionalExpression":
      return concat(
        getIdentifiersExpressionUses(expression.test),
        mergeUncertainAccesses(
          getIdentifiersExpressionUses(expression.consequent),
          getIdentifiersExpressionUses(expression.alternate)
        )
      );

    case "BinaryExpression":
    case "LogicalExpression": {
      if (types.isPrivateName(expression.left)) {
        identifiers = concat(
          identifiers,
          getIdentifiersPrivateNameUses(expression.left)
        );
      } else {
        identifiers = concat(
          identifiers,
          getIdentifiersExpressionUses(expression.left)
        );
      }

      identifiers = concat(
        identifiers,
        getIdentifiersExpressionUses(expression.right)
      );

      return identifiers;
    }

    case "CallExpression":
    case "NewExpression":
      return concat(
        getIdentifiersCalleeUses(expression.callee),
        getIdentifiersArgumentsUse(expression.arguments)
      );

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
      return createIdentifierAccess();

    case "ClassExpression":
      return getIdentifiersClassBodyUses(expression.body);

    case "ArrowFunctionExpression":
    case "FunctionExpression":
      return getIdentifiersMethodUses(expression);
  }

  console.warn("getIdentifiersExpressionUses() needs case", expression);

  return createIdentifierAccess();
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
