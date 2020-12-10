import * as types from "@babel/types";
import { rewriteExpression } from "./rewriteExpression";
import { Scope } from "./scope";

/**
 * Rewrites a variable declaration. If the variable needs extra setup that would be better to have earlier in the code it splits up the setup into steps.
 *
 * @param statement Declarations to rewrite
 * @param scope Scope
 */
export function rewriteVariableDeclaration(
  statement: types.VariableDeclaration,
  scope: Scope
): types.Statement[] {
  let statements: types.Statement[] = [];
  for (let declarator of statement.declarations) {
    let init = declarator.init;

    // Rewrite the initializer
    if (init) {
      // Concat to declarations if any additional setup is needed
      init = rewriteExpression(init, scope);
    }

    // Add the code to initialize the variable
    statements.push(
      types.variableDeclaration(statement.kind, [
        types.variableDeclarator(declarator.id, init),
      ])
    );
  }

  return statements;
}
