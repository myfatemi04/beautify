import * as types from "@babel/types";
import Scope from "./scope";

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
      declarations.push(types.variableDeclarator(declarator.id));

      if (declarator.init) {
        // Add the assignment afterwards
        assignments.push(
          types.assignmentExpression("=", declarator.id, declarator.init)
        );
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
  let hoisted: types.Statement[] = [];
  let notHoisted: types.Statement[] = [];

  for (let statement of statements) {
    if (statement.type === "VariableDeclaration") {
      let { declarations, assignments } = splitDeclarationAndAssignments(
        statement
      );
      hoisted = hoisted.concat(types.variableDeclaration("let", declarations));
      notHoisted = notHoisted.concat(
        ...assignments.map((assignment) =>
          types.expressionStatement(assignment)
        )
      );
    } else if (statement.type === "ForStatement") {
      notHoisted.push(statement);
    } else {
      notHoisted.push(statement);
    }
  }

  return hoisted.concat(notHoisted);
}
