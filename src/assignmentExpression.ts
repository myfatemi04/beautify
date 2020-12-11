import * as types from "@babel/types";
import { rewriteExpression } from "./expression";
import { Scope } from "./scope";

export function rewriteAssignmentExpression(
  expression: types.AssignmentExpression,
  scope: Scope
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
    rewriteExpression(expression.right, scope)
  );
}
