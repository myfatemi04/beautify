import * as types from "@babel/types";
import Preambleable, { addPreamble } from "./Preambleable";
import { rewriteExpressionStatement } from "./rewriteExpressionStatement";
import { rewriteExpression } from "./rewriteExpression";
import { Scope } from "./scope";

export function rewriteSequenceExpressionStatement(
  sequence: types.SequenceExpression,
  scope: Scope
): Preambleable<types.Statement> {
  let expressions = sequence.expressions;
  if (expressions.length > 0) {
    let preambleExpressions = expressions.slice(0, expressions.length - 1);
    let preamble: types.Statement[] = [];

    for (let expression of preambleExpressions) {
      let {
        preamble: preamble_,
        value: expressionStatement,
      } = rewriteExpressionStatement(
        types.expressionStatement(expression),
        scope
      );

      preamble = preamble.concat(preamble_);

      if (expressionStatement) {
        preamble.push(expressionStatement);
      }
    }

    let rewrittenExpressionStatement = rewriteExpressionStatement(
      types.expressionStatement(expressions[expressions.length - 1]),
      scope
    );
    preamble = preamble.concat(rewrittenExpressionStatement.preamble);

    return {
      preamble,
      value: rewrittenExpressionStatement.value,
    };
  } else {
    return {
      preamble: [],
      value: undefined,
    };
  }
}

/**
 * If something like (a, b = c, d(), f) is encountered, it turns the
 * preceeding expressions to ExpressionStatements, and the last to an
 * expression.
 * @param sequence The sequence expression
 * @param scope The scope
 */
export function rewriteSequenceExpressionUseLastValue(
  sequence: types.SequenceExpression,
  scope: Scope
): Preambleable<types.Expression> {
  let expressions = sequence.expressions;
  if (expressions.length > 0) {
    let preambleExpressions = expressions.slice(0, expressions.length - 1);
    let preamble: types.Statement[] = [];

    for (let expression of preambleExpressions) {
      let {
        preamble: preamble_,
        value: expressionStatement,
      } = rewriteExpressionStatement(
        types.expressionStatement(expression),
        scope
      );

      preamble = preamble.concat(preamble_);

      if (expressionStatement) {
        preamble.push(expressionStatement);
      }
    }

    let rewrittenExpression = rewriteExpression(
      expressions[expressions.length - 1],
      scope
    );
    preamble = preamble.concat(rewrittenExpression.preamble);

    return {
      preamble,
      value: rewrittenExpression.value,
    };
  } else {
    return {
      preamble: [],
      value: undefined,
    };
  }
}

export function rewriteSequenceExpression(
  sequence: types.SequenceExpression,
  scope: Scope
): Preambleable<types.SequenceExpression | types.Expression> {
  let expressions = sequence.expressions;
  if (expressions.length > 0) {
    let preambleExpressions = expressions.slice(0, expressions.length - 1);
    let preamble: types.Statement[] = [];
    for (let expression of preambleExpressions) {
      let { preamble: preamble_, value: expression_ } = rewriteExpression(
        expression,
        scope
      );

      preamble = preamble.concat(preamble_);

      if (expression_) {
        preamble.push(types.expressionStatement(expression_));
      }
    }

    let expression = expressions[expressions.length - 1];
    let rewrittenExpression = rewriteExpression(expression, scope);
    preamble = preamble.concat(rewrittenExpression.preamble);
    expression = rewrittenExpression.value;

    return {
      preamble,
      value: expression,
    };
  } else {
    return addPreamble(sequence);
  }
}
