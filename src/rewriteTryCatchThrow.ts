import * as types from "@babel/types";
import Preambleable from "./Preambleable";
import { rewriteBlockStatement } from "./rewriteBlockStatement";
import { rewriteExpression } from "./rewriteExpression";
import { Scope } from "./scope";

/**
 * Rewrites the body of a catch clause
 * @param clause catch (e) {}
 * @param scope Scope
 */
export function rewriteCatchClause(
  clause: types.CatchClause,
  scope: Scope
): types.CatchClause {
  return types.catchClause(
    clause.param,
    rewriteBlockStatement(clause.body, scope)
  );
}

/**
 * Rewrites the body of a try statement
 * Also rewrites the catch statement and finalizer if they exist
 *
 * @param statement try {} catch (e) {} finally {}
 * @param scope Scope
 */
export function rewriteTryStatement(
  statement: types.TryStatement,
  scope: Scope
): types.TryStatement {
  let block = rewriteBlockStatement(statement.block, scope);
  let handler = statement.handler
    ? rewriteCatchClause(statement.handler, scope)
    : undefined;

  let finalizer = statement.finalizer
    ? rewriteBlockStatement(statement.finalizer, scope)
    : undefined;

  return types.tryStatement(block, handler, finalizer);
}

/**
 * Rewrites a throw statement: the expression to be thrown.
 * If the expression needs additional setup, split it up.
 *
 * @param statement
 * @param scope
 */
export function rewriteThrowStatement(
  statement: types.ThrowStatement,
  scope: Scope
): Preambleable<types.ThrowStatement> {
  let { preamble, value: argument } = rewriteExpression(
    statement.argument,
    scope
  );
  return {
    preamble,
    value: types.throwStatement(argument),
  };
}
