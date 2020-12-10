import * as types from "@babel/types";
import { combine } from "./combine";
import { getIdentifiersFunctionParamsUse } from "./getIdentifiersFunctionParamsUse";
import { getIdentifiersLValUses } from "./getIdentifiersLValUses";
import { getIdentifiersMemberExpressionUses } from "./getIdentifiersMemberExpressionUses";
import { getIdentifiersObjectPropertyUses } from "./getIdentifiersObjectPropertyUses";
import { getIdentifiersPrivateNameUses } from "./getIdentifiersPrivateNameUses";
import { getIdentifiersStatementUses } from "./getIdentifiersStatementUses";
import { getIdentifiersCalleeUses } from "./getIdentifiersCalleeUses";
import { IdentifierAccess } from "./IdentifierAccess";

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
      // some elements in array expressions can be null; filter them out
      return getIdentifiersExpressionsUse(
        expression.elements.filter((element) => element != null)
      );

    case "ObjectExpression": {
      let identifiers = [];
      for (let property of expression.properties) {
        if (property.type === "SpreadElement") {
          identifiers = combine(
            identifiers,
            getIdentifiersExpressionUses(property)
          );
        } else if (property.type === "ObjectProperty") {
          identifiers = combine(
            identifiers,
            getIdentifiersObjectPropertyUses(property)
          );
        }
      }
      return identifiers;
    }

    case "AssignmentExpression": {
      // Get all identifiers of the left hand side.
      let identifiers: IdentifierAccess[] = [];
      identifiers.push(...getIdentifiersLValUses(expression.left));
      identifiers.push(...getIdentifiersExpressionUses(expression.right));
      return identifiers;
    }

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
