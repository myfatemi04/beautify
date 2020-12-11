import * as types from "@babel/types";
import generate from "@babel/generator";
import expressionHasSideEffects from "./expressionHasSideEffects";
import { getAllDeclaredIdentifiers } from "./getAllDeclaredIdentifiers";
import { getIdentifiersLValUses } from "./lval";
import { getIdentifiersStatementUses, rewriteStatement } from "./statement";

export class PathNode {
  body: types.Statement[];
  parent: PathNode | null;
  scoped: boolean;
  index: number = 0;
  blockDeclaredVariables: { [name: string]: boolean } = {};
  suggestedVariableNames: { [name: string]: string } = {};

  constructor(body: types.Statement[], scoped: boolean, parent?: PathNode) {
    this.body = body;
    this.scoped = scoped;

    if (parent) {
      this.parent = parent;
    } else {
      this.parent = null;
    }

    this.hoistAll();
  }

  hasVariableBeenDeclared(name: string) {
    return (
      this.blockDeclaredVariables[name] ||
      (this.parent && this.parent.hasVariableBeenDeclared(name))
    );
  }

  hasVariableBeenDeclaredThisBlock(name: string) {
    return this.blockDeclaredVariables[name];
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
      for (let access of identifierAccesses) {
        if (access.id.name === name) {
          if (access.type === "get") {
            return true;
          } else if (access.type === "set") {
            return false;
          } else {
            // it's a "define" type, so we don't know anything from here
          }
        }
      }
    }

    // if this variable was declared this block, it's impossible for it to have
    // been accessed outside
    if (this.blockDeclaredVariables[name]) {
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
      for (let access of identifierAccesses) {
        if (access.id.name === name && access.type === "set") {
          return true;
        }
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
      body.push(...rewriteStatement(statement, this));
      this.index++;
    }

    this.body = body;
    this.index = 0;

    this.moveDeclarationsInward();
    this.removeUnusedIdentifiers();
  }

  moveDeclarationsInward() {
    this.index = 0;
    let body: types.Statement[] = [];
    for (let statement of this.body) {
      // Here is where things get good

      // When a variable value is set, check to see if
      // its current value is ever referenced outside of this path.

      switch (statement.type) {
        case "ExpressionStatement": {
          let expression = statement.expression;
          if (types.isAssignmentExpression(expression, { operator: "=" })) {
            if (types.isIdentifier(expression.left)) {
              let name = expression.left.name;

              if (
                !this.isVariableUsedOutsideThisBlock(name) &&
                !this.hasVariableBeenDeclaredThisBlock(name)
              ) {
                // If this variable isn't used eventually,
                // and it hasn't been declared yet, then
                // we can turn this assignment into a "let"
                // statement.
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
                for (let identifier of getIdentifiersLValUses(declarator.id)) {
                  if (identifier.type === "set") {
                    this.declareInBlock(identifier.id.name);
                  }
                }

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
                // check if the initializer has side effects
                if (expressionHasSideEffects(declaration.init)) {
                  body.push(types.expressionStatement(declaration.init));
                }
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
      console.log("removing unused variable again");
      this.removeUnusedIdentifiers();
    }
  }

  declareInBlock(name: string) {
    this.blockDeclaredVariables[name] = true;
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
