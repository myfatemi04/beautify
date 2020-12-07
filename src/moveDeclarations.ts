import * as types from "@babel/types";
import * as uses from "./uses";
import { Scope } from "./scope";
import expressionHasSideEffects from "./expressionHasSideEffects";

type CheckIfUsedOutsideFunction = (identifier: string) => boolean;
type CheckIfDeclaredOutsideFunction = (identifier: string) => boolean;
type CheckIfUpdatedOutsideFunction = (identifier: string) => boolean;

/**
 * Looks for arrow functions and function declarations
 */
export function traverseExpression(
  expression: types.Expression,
  scope: Scope,
  isUsedOutside: CheckIfUsedOutsideFunction = () => false,
  isDeclaredOutside: CheckIfDeclaredOutsideFunction = () => false,
  isUpdatedOutside: CheckIfUpdatedOutsideFunction = () => false
): types.Expression {
  if (types.isIdentifier(expression)) {
    return expression;
  }

  if (types.isLiteral(expression)) {
    return expression;
  }

  const traverseExpression_ = (expression: types.Expression) => {
    return traverseExpression(
      expression,
      scope,
      isUsedOutside,
      isDeclaredOutside,
      isUpdatedOutside
    );
  };

  const moveDeclarationsInward_ = (statements: types.Statement[]) => {
    return moveDeclarationsInward(
      statements,
      scope,
      isUsedOutside,
      isDeclaredOutside,
      isUpdatedOutside
    );
  };

  switch (expression.type) {
    case "ArrayExpression":
      return types.arrayExpression(
        expression.elements.map((element) => {
          if (element.type === "SpreadElement") {
            return element;
          }

          return traverseExpression_(element);
        })
      );
    case "ObjectExpression":
      return types.objectExpression(
        expression.properties.map((element) => {
          if (element.type === "ObjectMethod") {
            return types.objectMethod(
              element.kind,
              element.key,
              element.params,
              types.blockStatement(moveDeclarationsInward_(element.body.body))
            );
          } else if (element.type === "ObjectProperty") {
            if (types.isPatternLike(element.value)) {
              throw new Error("Found pattern in Object Expression");
            } else {
              return types.objectProperty(
                traverseExpression_(element.key),
                traverseExpression_(element.value)
              );
            }
          } else if (element.type === "SpreadElement") {
            return element;
          } else {
            throw new Error("Invalid Object Property " + element);
          }
        })
      );
    case "AssignmentExpression":
      return types.assignmentExpression(
        expression.operator,
        expression.left,
        traverseExpression_(expression.right)
      );

    case "BinaryExpression":
      if (types.isPrivateName(expression.left)) {
        return types.binaryExpression(
          expression.operator,
          expression.left,
          traverseExpression_(expression.right)
        );
      } else {
        return types.binaryExpression(
          expression.operator,
          traverseExpression_(expression.left),
          traverseExpression_(expression.right)
        );
      }
    case "LogicalExpression":
      return types.logicalExpression(
        expression.operator,
        traverseExpression_(expression.left),
        traverseExpression_(expression.right)
      );

    case "ArrowFunctionExpression":
      if (types.isExpression(expression.body)) {
        return types.arrowFunctionExpression(
          expression.params,
          traverseExpression_(expression.body)
        );
      } else {
        return types.arrowFunctionExpression(
          expression.params,
          types.blockStatement(moveDeclarationsInward_(expression.body.body))
        );
      }

    case "FunctionExpression":
      return types.functionExpression(
        expression.id,
        expression.params,
        types.blockStatement(moveDeclarationsInward_(expression.body.body))
      );

    case "UnaryExpression":
      return types.unaryExpression(
        expression.operator,
        traverseExpression_(expression.argument)
      );

    case "CallExpression":
      return types.callExpression(
        // V8 intrinsic identifiers are just like identifiers
        types.isV8IntrinsicIdentifier(expression.callee)
          ? expression.callee
          : traverseExpression_(expression.callee),
        expression.arguments.map((argument) => {
          if (types.isSpreadElement(argument)) {
            return argument;
          } else if (types.isJSXNamespacedName(argument)) {
            return argument;
          } else if (types.isArgumentPlaceholder(argument)) {
            return argument;
          } else {
            return traverseExpression_(argument);
          }
        })
      );

    case "ConditionalExpression":
      return types.conditionalExpression(
        traverseExpression_(expression.test),
        traverseExpression_(expression.consequent),
        traverseExpression_(expression.alternate)
      );

    case "MemberExpression":
      if (types.isPrivateName(expression.property)) {
        return types.memberExpression(
          traverseExpression_(expression.object),
          expression.property,
          expression.computed,
          expression.optional
        );
      } else {
        return types.memberExpression(
          traverseExpression_(expression.object),
          traverseExpression_(expression.property),
          expression.computed,
          expression.optional
        );
      }
  }

  console.warn("traverseExpression() needs case", expression);

  return expression;
}

export function moveDeclarationsInward(
  statements: types.Statement[],
  scope: Scope,
  isUsedOutside: CheckIfUsedOutsideFunction = () => false,
  isDeclaredOutside: CheckIfDeclaredOutsideFunction = () => false,
  isUpdatedOutside: CheckIfUpdatedOutsideFunction = () => false
): types.Statement[] {
  let statement: types.Statement;
  let statementsUpdated: types.Statement[] = [];

  const hasBeenDeclared: { [name: string]: boolean } = {};

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

  const traverseExpression_ = (expression: types.Expression) => {
    return traverseExpression(
      expression,
      scope,
      isUsedOutside,
      isDeclaredOutside,
      isUpdatedOutside
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

        statementsUpdated.push(
          types.ifStatement(traverseExpression_(test), consequent, alternate)
        );
        continue;
      }

      case "ReturnStatement":
        if (statement.argument) {
          statementsUpdated.push(
            types.returnStatement(traverseExpression_(statement.argument))
          );
        } else {
          statementsUpdated.push(types.returnStatement());
        }
        continue;
    }

    console.log("reached end with statement", statement);

    statementsUpdated.push(statement);
  }

  return statementsUpdated;
}
