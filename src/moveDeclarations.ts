import * as types from "@babel/types";
import * as uses from "./uses";
import { Scope } from "./scope";

type CheckIfUsedAfterFunction = (identifier: string) => boolean;
type CheckIfDeclaredFunction = (identifier: string) => boolean;
type CheckIfDefinedInThisScopeFunction = (identifier: string) => boolean;

export function moveDeclarationsInward(
  statements: types.Statement[],
  scope: Scope,
  isUsedAfter: CheckIfUsedAfterFunction = () => false,
  isDeclared: CheckIfDeclaredFunction = () => false,
  isDefinedInThisScope: CheckIfDefinedInThisScopeFunction = () => false
): types.Statement[] {
  let statement: types.Statement;
  let statementsUpdated: types.Statement[] = [];

  let declared = {};

  const checkIfUsedAfter = (name: string) => {
    for (let statement of statements) {
      let externalUses = uses.getIdentifiersStatementUsesExternally(statement);
      let isOverwritten = false;
      let isRead = false;

      for (let use of externalUses) {
        if (use.id.name === name) {
          if (use.type === "get") {
            isRead = true;
            break;
          } else if (use.type === "set") {
            isOverwritten = true;
            break;
          }
        }
      }

      return isRead;
    }
  };

  const checkIfDeclared = (name: string) => {
    return name in declared;
  };

  const checkIfDefinedInThisScope = (name: string) => {
    return true;
  };

  const moveDeclarationsInward_ = (statements: types.Statement[]) => {
    return moveDeclarationsInward(
      statements,
      scope,
      checkIfUsedAfter,
      checkIfDeclared,
      checkIfDefinedInThisScope
    );
  };

  while ((statement = statements.shift())) {
    // Here is where things get good

    // When a variable value is set, check to see if
    // its current value is ever referenced outside of this scope.

    switch (statement.type) {
      case "ExpressionStatement": {
        let expression = statement.expression;
        if (expression.type === "AssignmentExpression") {
          if (types.isIdentifier(expression.left)) {
            let name = expression.left.name;
            let usedAfter = isUsedAfter(name);
            let declared = isDeclared(name);

            if (!usedAfter && !declared) {
              // If this variable isn't used eventually,
              // and it hasn't been declared yet, then
              // we can turn this assignment into a "let"
              // statement.
              statementsUpdated.push(
                types.variableDeclaration("let", [
                  types.variableDeclarator(
                    types.identifier(name),
                    expression.right
                  ),
                ])
              );
              continue;
            }
          }
        }

        statementsUpdated.push(statement);

        break;
      }

      case "BlockStatement": {
        statementsUpdated.push(
          types.blockStatement(moveDeclarationsInward_(statement.body))
        );

        break;
      }

      case "ForStatement": {
        // If the body isn't a block statement, it doesn't
        // have any variable declarations that aren't used
        // elsewhere.
        if (types.isBlockStatement(statement.body)) {
          statementsUpdated.push(
            types.forStatement(
              statement.init,
              statement.test,
              statement.update,
              types.blockStatement(moveDeclarationsInward_(statement.body.body))
            )
          );
        } else {
          statementsUpdated.push(statement);
        }

        break;
      }

      case "ForInStatement":
      case "ForOfStatement": {
        // If the body isn't a block statement, it doesn't
        // have any variable declarations that aren't used
        // elsewhere.
        let builder: typeof types.forInStatement | typeof types.forOfStatement =
          types.forInStatement;
        if (statement.type === "ForOfStatement") {
          builder = types.forOfStatement;
        }

        if (types.isBlockStatement(statement.body)) {
          statementsUpdated.push(
            builder(
              statement.left,
              statement.right,
              types.blockStatement(moveDeclarationsInward_(statement.body.body))
            )
          );
        } else {
          statementsUpdated.push(statement);
        }

        break;
      }

      case "WhileStatement":
      case "DoWhileStatement": {
        // If the body isn't a block statement, it doesn't
        // have any variable declarations that aren't used
        // elsewhere.
        let builder:
          | typeof types.whileStatement
          | typeof types.doWhileStatement = types.whileStatement;

        if (statement.type === "DoWhileStatement") {
          builder = types.doWhileStatement;
        }

        if (types.isBlockStatement(statement.body)) {
          statementsUpdated.push(
            builder(
              statement.test,
              types.blockStatement(moveDeclarationsInward_(statement.body.body))
            )
          );
        } else {
          statementsUpdated.push(statement);
        }

        break;
      }

      case "LabeledStatement": {
        if (types.isBlockStatement(statement.body)) {
          statementsUpdated.push(
            types.labeledStatement(
              statement.label,
              types.blockStatement(moveDeclarationsInward_(statement.body.body))
            )
          );
        } else {
          statementsUpdated.push(statement);
        }

        break;
      }

      case "FunctionDeclaration": {
        // Move the declarations of the function as inward as possible
        statementsUpdated.push(
          types.functionDeclaration(
            statement.id,
            statement.params,
            types.blockStatement(moveDeclarationsInward_(statement.body.body)),
            statement.generator,
            statement.async
          )
        );
      }
    }
  }

  return statementsUpdated;
}
