import * as types from "@babel/types";
import Preambleable from "./Preambleable";
import { rewriteExpressionsAndConcat } from "./rewriteExpression";
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
): Preambleable<types.VariableDeclaration> {
  let declarations: types.Statement[] = [];
  for (let declarator of statement.declarations) {
    let init = declarator.init;

    // Rewrite the initializer
    if (init) {
      // Concat to declarations if any additional setup is needed
      init = rewriteExpressionsAndConcat(init, scope, declarations);
    }

    // Add the code to initialize the variable
    declarations.push(
      types.variableDeclaration(statement.kind, [
        types.variableDeclarator(declarator.id, init),
      ])
    );
  }

  return {
    preamble: declarations,
    value: undefined,
  };
}