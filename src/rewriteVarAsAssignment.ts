import * as types from "@babel/types";

export function rewriteProgramVarsAsAssignments(
  program: types.Program
): types.Program {
  return types.program(
    program.body.map((statement) => rewriteVarsAsAssignments(statement)),
    program.directives,
    program.sourceType,
    program.interpreter
  );
}

export function rewriteBlockStatementVarsAsAssignments(
  statement: types.BlockStatement
): types.BlockStatement {
  return types.blockStatement(
    statement.body.map((statement) => {
      return rewriteVarsAsAssignments(statement);
    }),
    statement.directives
  );
}

export function rewriteStatementArrayVarsAsAssignments(
  statements: types.Statement[]
) {
  return statements.map((statement) => {
    return rewriteVarsAsAssignments(statement);
  });
}

export function variableDeclarationToSequenceAssignment(
  declaration: types.VariableDeclaration
): types.SequenceExpression {
  return types.sequenceExpression(
    declaration.declarations
      .map((declaration) => {
        if (declaration.init) {
          return types.assignmentExpression(
            "=",
            declaration.id,
            declaration.init
          );
        } else {
          return null;
        }
      })
      .filter((value) => value != null)
  );
}

export function rewriteVarsAsAssignments(
  statement: types.Statement
): types.Statement {
  if (statement == null) {
    return statement;
  }

  switch (statement.type) {
    case "VariableDeclaration":
      return types.expressionStatement(
        variableDeclarationToSequenceAssignment(statement)
      );

    case "BlockStatement":
      return rewriteBlockStatementVarsAsAssignments(statement);

    case "IfStatement":
      return types.ifStatement(
        statement.test,
        rewriteVarsAsAssignments(statement.consequent),
        rewriteVarsAsAssignments(statement.alternate)
      );

    case "DoWhileStatement":
      return types.doWhileStatement(
        statement.test,
        rewriteVarsAsAssignments(statement.body)
      );

    case "WhileStatement":
      return types.whileStatement(
        statement.test,
        rewriteVarsAsAssignments(statement.body)
      );

    case "ForStatement": {
      let init = statement.init;
      if (types.isVariableDeclaration(statement.init)) {
        init = variableDeclarationToSequenceAssignment(statement.init);
      } else {
        init = statement.init;
      }
      return types.forStatement(
        init,
        statement.test,
        statement.update,
        rewriteVarsAsAssignments(statement.body)
      );
    }

    // AKAIK you can't set the value of a var in these statements
    case "ForOfStatement":
    case "ForInStatement":
      break;
  }

  return statement;
}
