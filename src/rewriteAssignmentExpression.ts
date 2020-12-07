import * as types from "@babel/types";
import { lvalToExpression, patternToExpression } from "./patternToExpression";
import Preambleable, { addPreamble } from "./Preambleable";
import { rewriteExpressionsAndReduce } from "./rewriteExpression";
import { Scope } from "./scope";

export function rewriteAssignmentExpression(
  expression: types.AssignmentExpression,
  scope: Scope
): Preambleable<types.AssignmentExpression | types.UpdateExpression> {
  let rightIsOne = false;
  if (expression.right.type === "NumericLiteral") {
    if (expression.right.value === 1) {
      rightIsOne = true;
    }
  }

  // replace "+= 1" with "++".
  if (rightIsOne && types.isIdentifier(expression.left)) {
    if (expression.operator === "+=") {
      return addPreamble(types.updateExpression("++", expression.left, true));
    } else if (expression.operator === "-=") {
      return addPreamble(types.updateExpression("--", expression.left, true));
    }
  }

  // if you're doing something like... "A = B = C",
  // then we split it into "B = C", "A = B"
  if (types.isAssignmentExpression(expression.right)) {
    let { preamble, value } = rewriteAssignmentExpression(
      expression.right,
      scope
    );
    preamble.push(types.expressionStatement(value));

    if (types.isTSParameterProperty(expression.right.left)) {
      throw new Error(
        "Attempting to assign to TSParameterProperty: " +
          JSON.stringify(expression)
      );
    } else if (types.isRestElement(expression.right.left)) {
      throw new Error(
        "Attempting to assign to Rest Element: " + JSON.stringify(expression)
      );
    } else {
      let right: types.Expression;
      if (types.isPattern(expression.right.left)) {
        right = patternToExpression(expression.right.left);
      } else if (types.isExpression(expression.right.left)) {
        right = expression.right.left;
      } else {
        throw new Error(
          "Impossible LVAL: " + JSON.stringify(expression.right.left)
        );
      }

      return {
        preamble,
        value: types.assignmentExpression(
          expression.operator,
          expression.left,
          right
        ),
      };
    }
  } else {
    let [preamble, [right]] = rewriteExpressionsAndReduce(
      scope,
      expression.right
    );

    return {
      preamble,
      value: types.assignmentExpression(
        expression.operator,
        expression.left,
        right
      ),
    };
  }
}
