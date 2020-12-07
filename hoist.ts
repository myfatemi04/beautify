import * as types from "@babel/types";
import { createIdentifier } from "./create";
import BASE_NODE from "./base_node";
import Scope from "./scope";

function fromVarToLet(
  statement: types.VariableDeclaration
): types.VariableDeclaration {
  return {
    ...BASE_NODE,
    type: "VariableDeclaration",
    kind: "let",
    declarations: statement.declarations,
    declare: false,
  };
}

function hoistFor(
  forStatement: types.ForStatement
): {
  declarations: types.VariableDeclarator[];
  forStatement: types.ForStatement;
} {
  if (forStatement.init && forStatement.init.type === "VariableDeclaration") {
    let { declarations, assignments } = splitDeclarationAndAssignments(
      forStatement.init
    );

    return {
      declarations,
      forStatement: {
        ...forStatement,
        init: types.sequenceExpression(assignments),
      },
    };
  }
}

/**
 * Takes something like "var a, b, c = 1" and turns it into
 *
 * var a
 * var b
 * var c
 *
 * c = 1
 *
 * @param statement declaration to make
 */
export function splitDeclarationAndAssignments(
  statement: types.VariableDeclaration
) {
  let declarations: types.VariableDeclarator[] = [];
  let assignments: types.AssignmentExpression[] = [];

  if (statement.kind === "var") {
    for (let declarator of statement.declarations) {
      if (declarator.id.type === "Identifier") {
        declarations.push(types.variableDeclarator(declarator.id));

        if (declarator.init) {
          // Add the assignment afterwards
          assignments.push(
            types.assignmentExpression(
              "=",
              types.identifier(declarator.id.name),
              declarator.init
            )
          );
        }
      } else {
        declarations = declarations.concat(statement.declarations);
      }
    }
  } else {
    declarations = statement.declarations;
  }

  return {
    declarations,
    assignments,
  };
}

export function hoistStatement(statement: types.Statement) {
  let declarations: types.VariableDeclaration[] = [];
  let assignments = [];
  let newStatement = null;

  switch (statement.type) {
    case "VariableDeclaration":
  }
}

export default function hoist(
  statements: types.Statement[]
  // scope: Scope
): types.Statement[] {
  let notHoisted = [];

  for (let statement of statements) {
    if (statement.type === "VariableDeclaration") {
      let { declarations, assignments } = splitDeclarationAndAssignments(
        statement
      );
      for (let declaration of declarations) {
      }
    } else if (statement.type === "ForStatement") {
      notHoisted.push(statement);
    } else {
      notHoisted.push(statement);
    }
  }

  return [].concat(notHoisted);
}
