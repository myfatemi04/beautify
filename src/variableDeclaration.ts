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

    let idIdentifiers = getIdentifiersLValUses(declaration.id);

    // Anything that was "set" is now "define" instead, because it was defined in this block
    idIdentifiers.define = idIdentifiers.set;
    idIdentifiers.set = new Set<string>();

    identifiers = concat(identifiers, idIdentifiers);
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
