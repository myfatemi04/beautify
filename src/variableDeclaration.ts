import * as types from "@babel/types";
import { getIdentifiersExpressionUses, rewriteExpression } from "./expression";
import { getIdentifiersLValUses } from "./lval";
import {
  concat,
  createIdentifierAccess,
  IdentifierAccess_,
} from "./IdentifierAccess";
import { PathNode } from "./path";
import { rewriteSequenceExpressionStatementGetLastValue } from "./sequenceExpression";

export function getIdentifiersVariableDeclarationUses(
  declaration_: types.VariableDeclaration
): IdentifierAccess_ {
  let identifiers: IdentifierAccess_ = createIdentifierAccess();
  for (let declaration of declaration_.declarations) {
    if (declaration.init) {
      let i = getIdentifiersExpressionUses(declaration.init);
      identifiers = concat(identifiers, i);
    }

    let lvalIdentifiers = getIdentifiersLValUses(declaration.id);
    lvalIdentifiers.get.forEach((id) => {
      identifiers.get.add(id);
    });

    lvalIdentifiers.set.forEach((id) => {
      if (!identifiers.get.has(id)) {
        identifiers.set.add(id);
      }
    });
  }
  return identifiers;
}
/**
 * Rewrites a variable declaration. If the variable needs extra setup that would be better to have earlier in the code it splits up the setup into steps.
 *
 * @param statement Declarations to rewrite
 * @param path path
 */
export function rewriteVariableDeclaration(
  statement: types.VariableDeclaration,
  path: PathNode
): types.Statement[] {
  let statements: types.Statement[] = [];
  // If this is a 'var' declaration, check to see if the var has already been declared
  // in this scope. if they have, change to an assignmentexpression
  if (statement.kind === "var") {
    for (let declarator of statement.declarations) {
      if (!declarator.init) {
        // don't convert this to an assignmentExpression
        statements.push(types.variableDeclaration("var", [declarator]));
        continue;
      }

      let assignedIdentifiers = getIdentifiersLValUses(declarator.id).set;
      let allAreDeclared = true;
      for (let identifier of Array.from(assignedIdentifiers)) {
        if (!path.hasVariableBeenDeclared(identifier)) {
          allAreDeclared = false;
        }
      }

      if (allAreDeclared) {
        statements.push(
          types.expressionStatement(
            types.assignmentExpression("=", declarator.id, declarator.init)
          )
        );
      } else {
        statements.push(types.variableDeclaration("var", [declarator]));
      }
    }

    return statements;
  }

  // Otherwise, just add regular 'var' declarations
  for (let declarator of statement.declarations) {
    let init = declarator.init;

    // Rewrite the initializer
    if (init) {
      if (types.isSequenceExpression(init)) {
        // Concat to declarations if any additional setup is needed
        let {
          value,
          preceeding,
        } = rewriteSequenceExpressionStatementGetLastValue(init, path);

        init = value;
        statements.push(...preceeding);
      } else {
        init = rewriteExpression(init, path);
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

export function variableDeclarationToAssignmentExpressions(
  declaration: types.VariableDeclaration
): types.AssignmentExpression[] {
  let assignments: types.AssignmentExpression[] = [];
  for (let declarator of declaration.declarations) {
    assignments.push(
      types.assignmentExpression("=", declarator.id, declarator.init)
    );
  }

  return assignments;
}
