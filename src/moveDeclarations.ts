import * as types from "@babel/types";
import * as uses from "./uses";
import { Scope } from "./scope";
import expressionHasSideEffects from "./expressionHasSideEffects";

type CheckIfUsedOutsideFunction = (identifier: string) => boolean;
type CheckIfDeclaredOutsideFunction = (identifier: string) => boolean;
type CheckIfUpdatedOutsideFunction = (identifier: string) => boolean;

export function moveDeclarationsInward(
  statements: types.Statement[],
  scope: Scope,
  isUsedOutside: CheckIfUsedOutsideFunction = () => false,
  isDeclaredOutside: CheckIfDeclaredOutsideFunction = () => false,
  isUpdatedOutside: CheckIfUpdatedOutsideFunction = () => false
): types.Statement[] {
  let statement: types.Statement;
  let statementsUpdated: types.Statement[] = [];

  const hasBeenDeclared = {};

  const checkIfUsedInside = (name: string) => {
    for (let statement of statements) {
      let externalUses = uses.getIdentifiersStatementUsesExternally(statement);

      for (let use of externalUses) {
        if (use.id.name === name) {
          if (use.type === "get") {
            return true;
          } else {
            return false;
          }
        }
      }
    }
    return false;
  };

  const checkIfUsedLater: CheckIfUsedOutsideFunction = (name: string) => {
    return checkIfUsedInside(name) || isUsedOutside(name);
  };

  const checkIfUpdatedInside = (name: string) => {
    for (let statement of statements) {
      let externalUses = uses.getIdentifiersStatementUsesExternally(statement);

      for (let use of externalUses) {
        if (use.id.name === name) {
          if (use.type === "set") {
            return true;
          }
        }
      }
    }

    return false;
  };

  const checkIfUpdatedLater: CheckIfUpdatedOutsideFunction = (name: string) => {
    return checkIfUpdatedInside(name) || isUpdatedOutside(name);
  };

  const checkIfDeclaredOutside: CheckIfDeclaredOutsideFunction = (
    name: string
  ) => {
    return name in hasBeenDeclared || isDeclaredOutside(name);
  };

  const moveDeclarationsInward_ = (statements: types.Statement[]) => {
    return moveDeclarationsInward(
      statements,
      scope,
      checkIfUsedLater,
      checkIfDeclaredOutside,
      checkIfUpdatedLater
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

            // the value is unused:
            if (!checkIfUsedLater(name)) {
              // check if the expression actually does something
              if (expressionHasSideEffects(expression.right)) {
                statementsUpdated.push(
                  types.expressionStatement(expression.right)
                );
              }

              continue;
            }

            let usedOutsideThisBlock = isUsedOutside(name);
            let declaredAlreadyInsideThisBlock = isDeclaredOutside(name);
            let updatedAfter = isUpdatedOutside(name);

            if (!usedOutsideThisBlock && !declaredAlreadyInsideThisBlock) {
              // If this variable isn't used eventually,
              // and it hasn't been declared yet, then
              // we can turn this assignment into a "let"
              // statement.
              statementsUpdated.push(
                types.variableDeclaration(updatedAfter ? "let" : "const", [
                  types.variableDeclarator(
                    types.identifier(name),
                    expression.right
                  ),
                ])
              );

              hasBeenDeclared[name] = true;

              delete scope.vars[name];

              continue;
            }
          }
        }

        statementsUpdated.push(statement);

        continue;
      }

      case "BlockStatement": {
        statementsUpdated.push(
          types.blockStatement(moveDeclarationsInward_(statement.body))
        );

        continue;
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

        continue;
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

        continue;
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

        continue;
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

        continue;
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

        continue;
      }

      case "IfStatement": {
        let { test, consequent, alternate } = statement;

        if (types.isBlockStatement(consequent)) {
          consequent = types.blockStatement(
            moveDeclarationsInward_(consequent.body)
          );
        }

        if (types.isBlockStatement(alternate)) {
          alternate = types.blockStatement(
            moveDeclarationsInward_(alternate.body)
          );
        }

        statementsUpdated.push(types.ifStatement(test, consequent, alternate));
        continue;
      }
    }

    statementsUpdated.push(statement);
  }

  return statementsUpdated;
}
