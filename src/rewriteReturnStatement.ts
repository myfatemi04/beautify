import * as types from "@babel/types";
import { createIfStatement } from "./createIfStatement";
import Preambleable, { addPreamble } from "./Preambleable";
import { rewriteExpression } from "./rewriteExpression";
import {
  rewriteSequenceExpression,
  rewriteSequenceExpressionStatement,
  rewriteSequenceExpressionUseLastValue,
} from "./rewriteSequenceExpression";
import { Scope } from "./scope";

/**
 * Rewrites the argument of a return statement.
 * If the argument is a conditional (a ? b : c), converts the return statement
 * to an if statement.
 *
 * @param statement return x;
 * @param scope Scope
 */
export function rewriteReturnStatement(
  statement: types.ReturnStatement,
  scope: Scope
): Preambleable<types.ReturnStatement | types.IfStatement> {
  if (!statement.argument) {
    return addPreamble(statement);
  } else {
    if (statement.argument.type === "ConditionalExpression") {
      let { test, consequent, alternate } = statement.argument;

      return createIfStatement(
        test,
        types.returnStatement(consequent),
        types.returnStatement(alternate),
        scope
      );
    }

    if (statement.argument.type === "SequenceExpression") {
      let { preamble, value } = rewriteSequenceExpressionUseLastValue(
        statement.argument,
        scope
      );

      return {
        preamble,
        value: types.returnStatement(value),
      };
    }

    let { preamble, value } = rewriteExpression(statement.argument, scope);
    return {
      preamble,
      value: types.returnStatement(value),
    };
  }
}
