import * as types from "@babel/types";
import { getIdentifiersExpressionUses, rewriteExpression } from "./expression";
import {
  concat,
  createIdentifierAccess,
  IdentifierAccess_,
} from "./IdentifierAccess";
import { getIdentifiersLValUses } from "./lval";
import { PathNode } from "./path";

export function rewriteAssignmentExpression(
  expression: types.AssignmentExpression,
  path: PathNode
): types.AssignmentExpression | types.UpdateExpression {
  let rightIsOne = false;
  if (expression.right.type === "NumericLiteral") {
    if (expression.right.value === 1) {
      rightIsOne = true;
    }
  }

  // replace "+= 1" with "++".
  if (rightIsOne && types.isIdentifier(expression.left)) {
    if (expression.operator === "+=") {
      return types.updateExpression("++", expression.left, true);
    } else if (expression.operator === "-=") {
      return types.updateExpression("--", expression.left, true);
    }
  }

  return types.assignmentExpression(
    expression.operator,
    expression.left,
    rewriteExpression(expression.right, path)
  );
}

export function getIdentifiersAssignmentExpressionUses(
  expression: types.AssignmentExpression
): IdentifierAccess_ {
  // Get all identifiers of the left hand side.
  let identifiers: IdentifierAccess_ = createIdentifierAccess();
  identifiers = concat(identifiers, getIdentifiersLValUses(expression.left));
  identifiers = concat(
    identifiers,
    getIdentifiersExpressionUses(expression.right)
  );
  return identifiers;
}
