import * as types from "@babel/types";
import createHoistedVariableDeclarations from "./createHoistedDeclarations";
import { moveDeclarationsInward } from "./moveDeclarations";
import { rewriteStatement } from "./rewriteStatement";
import { rewriteStatementArrayVarsAsAssignments } from "./rewriteVarAsAssignment";
import { Scope, hoistAll } from "./scope";

/**
 * Rewrites an array of statements (the body of a function block).
 * 
 * Setup:
 *  * Hoist all var declarations
 *  * Rewrite var declarations as assignments
 * 
 * Rewrite statements individually
 * 
 * Convert "var" declarations to "let", by moving declarations to only
 * the block their value is used in.
 * 
 * @param body body of a scoped block (Function block)
 * @param parent Parent scoped block
 */
export function rewriteScopedStatementArray(
  body: types.Statement[],
  parent: Scope
): types.Statement[] {
  let scope: Scope = {
    vars: {},
    parent: parent,
  };

  hoistAll(body, scope);
  body = rewriteStatementArrayVarsAsAssignments(body);
  body = rewriteStatementArray(body, scope);

  // This updates the variable "scope", removing var declarations as necessary
  body = moveDeclarationsInward(body, scope);

  // Any declarations that still need to be added are placed at the start
  let varDeclarations = createHoistedVariableDeclarations(
    Object.keys(scope.vars)
  );

  // body = [...varDeclarations, ...body];

  return body;
}

/**
 * Simply rewrites each statement individually
 * 
 * @param statements Statement array
 * @param scope Scope
 */
export function rewriteStatementArray(
  statements: types.Statement[],
  scope: Scope
) {
  let statements_: types.Statement[] = [];
  for (let statement of statements) {
    let { preamble, value: statement_ } = rewriteStatement(statement, scope);

    statements_ = statements_.concat(preamble);

    if (statement_) {
      statements_.push(statement_);
    }
  }

  return statements_;
}