import * as types from "@babel/types";
import generate from "@babel/generator";
import expressionHasSideEffects from "./expressionHasSideEffects";
import { getAllDeclaredIdentifiers } from "./getAllDeclaredIdentifiers";
import { getIdentifiersLValUses } from "./lval";
import { getIdentifiersStatementUses, rewriteStatement } from "./statement";
import { rewriteExpression } from "./expression";

export class PathNode {
  body: types.Statement[];
  parent: PathNode | null;
  scoped: boolean;
  index: number = 0;
  variablesFromFunctionParameters = new Set<string>();
  variablesFromDeclaration = new Set<string>();
  suggestedVariableNames: { [name: string]: string } = {};

  constructor(
    body: types.Statement[],
    scoped: boolean,
    parent?: PathNode,
    variablesFromFunctionParameters?: Set<string>
  ) {
    this.body = body;
    this.scoped = scoped;

    if (parent) {
      this.parent = parent;
    } else {
      this.parent = null;
    }

    if (variablesFromFunctionParameters) {
      this.variablesFromFunctionParameters = variablesFromFunctionParameters;
    }

    this.hoistAll();
  }

  hasVariableBeenDeclared(name: string) {
    return (
      this.variablesFromDeclaration.has(name) ||
      this.variablesFromFunctionParameters.has(name) ||
      (this.parent && this.parent.hasVariableBeenDeclared(name))
    );
  }

  hasVariableBeenDeclaredThisBlock(name: string) {
    return (
      this.variablesFromDeclaration.has(name) ||
      this.variablesFromFunctionParameters.has(name)
    );
  }

  getNodeThatDeclaresVariable(name: string): PathNode | null {
    if (this.hasVariableBeenDeclaredThisBlock(name)) {
      return this;
    } else {
      if (this.parent) {
        return this.getNodeThatDeclaresVariable(name);
      }
    }

    return null;
  }

  suggestVariableName(previous: string, suggested: string) {
    if (this.getNodeThatDeclaresVariable(previous) !== this) {
      throw new Error(
        "Cannot suggest variable name in block that does not declare it"
      );
    }

    this.suggestedVariableNames[previous] = suggested;
  }

  getBestVariableName(name: string): string {
    if (name in this.suggestedVariableNames) {
      return this.suggestedVariableNames[name];
    } else {
      return name;
    }
  }

  isVariableUsedOutsideThisBlock(name: string): boolean {
    if (this.parent) {
      return this.parent.isVariableUsedLater(name);
    } else {
      return false;
    }
  }

  isVariableUsedLater(name: string): boolean {
    for (let statement of this.getFollowingStatements()) {
      let identifierAccesses = getIdentifiersStatementUses(statement);
      if (identifierAccesses.get.has(name)) {
        return true;
      } else if (identifierAccesses.set.has(name)) {
        return false;
      }
    }

    // if this variable was declared this block, it's impossible for it to have
    // been accessed outside
    if (this.variablesFromDeclaration.has(name)) {
      return false;
    }

    if (this.parent) {
      return this.parent.isVariableUsedLater(name);
    } else {
      return false;
    }
  }

  getFollowingStatements() {
    return this.body.slice(this.index + 1);
  }

  isVariableUpdatedLater(name: string): boolean {
    for (let statement of this.getFollowingStatements()) {
      let identifierAccesses = getIdentifiersStatementUses(statement);
      if (identifierAccesses.set.has(name)) {
        return true;
      }
    }

    if (this.parent) {
      return this.parent.isVariableUpdatedLater(name);
    } else {
      return false;
    }
  }

  rewrite() {
    this.hoistAll();

    let body: types.Statement[] = [];
    this.index = 0;
    for (let statement of this.body) {
      // check if it's a variable declaration
      // if it's a variable declaration, either rewrite it
      // as an assignment or remove it
      if (types.isVariableDeclaration(statement)) {
        for (let declarator of statement.declarations) {
          if (declarator.init) {
            body.push(
              types.expressionStatement(
                types.assignmentExpression(
                  "=",
                  declarator.id,
                  rewriteExpression(declarator.init, this)
                )
              )
            );
          } else {
            // no initializer, don't include this declaration yet
            // it will be added later in this.insertVariableDeclarations()
          }
        }
      } else {
        body.push(...rewriteStatement(statement, this));
      }
      this.index++;
    }

    this.body = body;
    this.index = 0;

    this.moveDeclarationsInward();
    this.removeUnusedIdentifiers();
    this.insertVariableDeclarations();
  }

  moveDeclarationsInward() {
    this.index = 0;
    let body: types.Statement[] = [];
    for (let statement of this.body) {
      // Here is where things get good

      // When a variable value is set, check to see if
      // its current value is ever referenced outside of this path.

      switch (statement.type) {
        // Check if it's an assignment (a = b)
        case "ExpressionStatement": {
          let expression = statement.expression;
          if (types.isAssignmentExpression(expression, { operator: "=" })) {
            if (types.isIdentifier(expression.left)) {
              let name = expression.left.name;

              if (
                !this.isVariableUsedOutsideThisBlock(name) &&
                !this.hasVariableBeenDeclaredThisBlock(name)
              ) {
                // If this variable isn't used outside this block,
                // and it hasn't been declared yet, then it becomes "let"
                body.push(
                  types.variableDeclaration(
                    this.isVariableUpdatedLater(name) ? "let" : "const",
                    [
                      types.variableDeclarator(
                        expression.left,
                        expression.right
                      ),
                    ]
                  )
                );

                this.declareInBlock(name);
                break;
              }
            }
          }

          body.push(statement);
          continue;
        }

        case "VariableDeclaration": {
          if (statement.declarations.length === 1) {
            let { id, init } = statement.declarations[0];
            if (types.isIdentifier(id)) {
              // if (init) because const needs initializer
              // convert "let" to "const"
              if (init && !this.isVariableUpdatedLater(id.name)) {
                this.declareInBlock(id.name);
                body.push(
                  types.variableDeclaration("const", statement.declarations)
                );

                break;
              }
            }
          }

          body.push(
            types.variableDeclaration(
              "let",
              statement.declarations.map((declarator) => {
                getIdentifiersLValUses(declarator.id).set.forEach(
                  (identifier) => {
                    this.declareInBlock(identifier);
                  }
                );

                return declarator;
              })
            )
          );

          continue;
        }

        case "BlockStatement":
        case "ForStatement":
        case "ForInStatement":
        case "ForOfStatement":
        case "WhileStatement":
        case "DoWhileStatement":
        case "LabeledStatement":
        case "FunctionDeclaration":
        case "IfStatement":
        case "ReturnStatement":
        case "TryStatement":
        case "BreakStatement":
        case "ContinueStatement":
        case "ThrowStatement":
        case "ClassDeclaration":
        case "SwitchStatement": // TODO take care of case consequents being stupid mfs
          body.push(statement);
          break;

        case "EmptyStatement":
          break;

        default:
          console.log("moveDeclarations() needs statement", statement);
          body.push(statement);
      }

      this.index += 1;
    }

    this.body = body;
  }

  undeclareThisBlock(name: string) {
    this.variablesFromDeclaration.delete(name);
  }

  removeUnusedIdentifiers() {
    this.index = 0;
    let body = [];
    let foundUnused = false;

    for (let statement of this.body) {
      checkBlock: {
        if (types.isVariableDeclaration(statement)) {
          for (let declaration of statement.declarations) {
            if (types.isIdentifier(declaration.id)) {
              if (!this.isVariableUsedLater(declaration.id.name)) {
                this.undeclareThisBlock(declaration.id.name);
                // check if the initializer has side effects
                if (expressionHasSideEffects(declaration.init)) {
                  body.push(types.expressionStatement(declaration.init));
                }
                // console.log("Found unused:", generate(statement).code);
                foundUnused = true;
                break checkBlock;
              }
              // otherwise, variable is used
            }
          }
        } else if (types.isExpressionStatement(statement)) {
          let expression = statement.expression;
          if (types.isAssignmentExpression(expression, { operator: "=" })) {
            if (types.isIdentifier(expression.left)) {
              // the value is unused:
              if (!this.isVariableUsedLater(expression.left.name)) {
                // check if the expression actually does something
                if (expressionHasSideEffects(expression.right)) {
                  body.push(types.expressionStatement(expression.right));
                }
                foundUnused = true;
                break checkBlock;
              }
              // otherwise, variable is used
            }
          }
        }

        body.push(statement);
      }

      this.index += 1;
    }

    this.body = body;

    // if another unused identifier is found, remove them again
    if (foundUnused) {
      this.removeUnusedIdentifiers();
    }
  }

  declareInBlock(name: string) {
    this.variablesFromDeclaration.add(name);
  }

  declareInScope(name: string) {
    if (this.scoped) {
      this.declareInBlock(name);
    } else {
      if (this.parent) {
        this.parent.declareInScope(name);
      } else {
        throw new Error("Could not declare identifier in scope: " + name);
      }
    }
  }

  /**
   * For each variable that is declared this block,
   * insert a "let ___" just before the statement that uses it first.
   */
  insertVariableDeclarations() {
    for (let identifier of Array.from(this.variablesFromDeclaration)) {
      let body: types.Statement[] = [];
      let i = 0;
      for (let statement of this.body) {
        let identifiersUsed = getIdentifiersStatementUses(statement);
        if (
          types.isExpressionStatement(statement) &&
          types.isAssignmentExpression(statement.expression, {
            operator: "=",
          }) &&
          types.isIdentifier(statement.expression.left, { name: identifier })
        ) {
          // if it's an assignment, and it explicitly sets this identifier,
          // then we just write it as a variable declaration directly

          body.push(
            types.variableDeclaration("let", [
              types.variableDeclarator(
                statement.expression.left,
                statement.expression.right
              ),
            ])
          );
          body.push(...this.body.slice(i + 1));
          break;
        }

        // if the variable is set or read here, we define it just before.
        // then, we push the rest of the body and break the loop.
        if (
          identifiersUsed.get.has(identifier) ||
          identifiersUsed.set.has(identifier)
        ) {
          if (!types.isVariableDeclaration(statement)) {
            // if it wasn't the variable declaration, then add a variable declaration
            body.push(
              types.variableDeclaration("let", [
                types.variableDeclarator(types.identifier(identifier)),
              ])
            );
          }
          body.push(statement);
          body.push(...this.body.slice(i + 1));
          break;
        } else {
          body.push(statement);
        }

        i++;
      }
      this.body = body;
    }
  }

  private hoistAll(): void {
    for (let statement of this.body) {
      this.hoist(statement);
    }
  }

  private hoist(statement: types.Statement): void {
    if (statement == null) {
      return;
    }

    switch (statement.type) {
      case "VariableDeclaration":
        // Hoist "var" declarations
        if (statement.kind === "var") {
          for (let identifier of getAllDeclaredIdentifiers(statement)) {
            this.declareInScope(identifier.name);
          }
        }
        break;

      case "BlockStatement":
        new PathNode(statement.body, false, this).hoistAll();
        break;

      case "IfStatement":
        this.hoist(statement.consequent);
        this.hoist(statement.alternate);
        break;

      case "DoWhileStatement":
      case "WhileStatement":
        this.hoist(statement.body);
        break;

      case "ForStatement":
        if (types.isVariableDeclaration(statement.init)) {
          this.hoist(statement.init);
        }
        this.hoist(statement.body);
        break;

      case "ForOfStatement":
      case "ForInStatement":
        if (types.isVariableDeclaration(statement.left)) {
          this.hoist(statement.left);
        }
        this.hoist(statement.body);
        break;
    }
  }
}
