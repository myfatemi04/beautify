import * as types from "@babel/types";
import createHoistedVariableDeclarations from "./createHoistedDeclarations";
import { moveDeclarationsInward } from "./moveDeclarations";
import { rewriteStatement } from "./statement";
import { rewriteStatementArrayVarsAsAssignments } from "./rewriteVarAsAssignment";
import { PathNode, hoistAll } from "./path";

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
 * @param body body of a pathd block (Function block)
 * @param parent Parent pathd block
 */
export function rewriteScopedStatementArray(
  body: types.Statement[],
  parent: PathNode
): types.Statement[] {
  let path = new PathNode(body, true, parent);

  hoistAll(body, path);
  body = rewriteStatementArrayVarsAsAssignments(body);
  body = rewriteStatementArray(body, path);

  // This updates the variable "path", removing var declarations as necessary
  body = moveDeclarationsInward(body, path);

  // Any declarations that still need to be added are placed at the start
  let varDeclarations = createHoistedVariableDeclarations(
    Object.keys(path.blockDeclaredVariables)
  );

  body = [...varDeclarations, ...body];

  return body;
}

/**
 * Simply rewrites each statement individually
 *
 * @param statements Statement array
 * @param path path
 */
export function rewriteStatementArray(
  statements: types.Statement[],
  path: PathNode
) {
  let statements_: types.Statement[] = [];
  for (let statement of statements) {
    statements_.push(...rewriteStatement(statement, path));
  }

  return statements_;
}
