import * as types from "@babel/types";
import { getIdentifiersExpressionUses, rewriteExpression } from "./expression";
import { getIdentifiersLValUses } from "./lval";
import { IdentifierAccess } from "./IdentifierAccess";
import { Scope } from "./scope";
import { rewriteSequenceExpressionStatementGetLastValue } from "./sequenceExpression";

export function getIdentifiersVariableDeclarationUses(
  declaration_: types.VariableDeclaration
): IdentifierAccess[] {
  let identifiers: IdentifierAccess[] = [];
  for (let declaration of declaration_.declarations) {
    if (declaration.init) {
      let i = getIdentifiersExpressionUses(declaration.init);
      identifiers.push(...i);
    }

    identifiers.push(
      ...getIdentifiersLValUses(declaration.id).map((access) => {
        if (access.type === "set") {
          return <IdentifierAccess>{
            type: "define",
            id: access.id,
          };
        } else {
          return access;
        }
      })
    );
  }
  return identifiers;
}
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
      if (types.isSequenceExpression(init)) {
        // Concat to declarations if any additional setup is needed
        let {
          value,
          preceeding,
        } = rewriteSequenceExpressionStatementGetLastValue(init, scope);

        init = value;
        statements.push(...preceeding);
      } else {
        init = rewriteExpression(init, scope);
      }
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
