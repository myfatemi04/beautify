import * as types from "@babel/types";
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
    for (let statement of this.body.slice(this.index + 1)) {
      let identifierAccesses = getIdentifiersStatementUses(statement);
      for (let access of identifierAccesses) {
        if (access.id.name === name) {
          if (access.type === "get") {
            return true;
          } else {
            return false;
          }
        }
      }
    }

    if (this.parent) {
      return this.parent.isVariableUsedLater(name);
    } else {
      return false;
    }
  }

  isVariableUpdatedLater(name: string): boolean {
    for (let statement of this.body.slice(this.index)) {
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

    let newBody: types.Statement[] = [];
    this.index = 0;
    for (let statement of this.body) {
      newBody.push(...rewriteStatement(statement, this));
      this.index++;
    }

    this.body = newBody;
    this.index = 0;

    this.moveDeclarationsInward();
  }

  moveDeclarationsInward() {
    let statementsUpdated: types.Statement[] = [];
    this.index = 0;
    for (let statement of this.body) {
      // Here is where things get good

      // When a variable value is set, check to see if
      // its current value is ever referenced outside of this path.

      switch (statement.type) {
        case "ExpressionStatement": {
          let expression = statement.expression;
          if (expression.type === "AssignmentExpression") {
            if (types.isIdentifier(expression.left)) {
              let name = expression.left.name;

              // the value is unused:
              if (!this.isVariableUsedLater(name)) {
                // check if the expression actually does something
                if (expressionHasSideEffects(expression.right)) {
                  statementsUpdated.push(
                    types.expressionStatement(expression.right)
                  );
                }

                continue;
              }

              if (
                !this.isVariableUsedOutsideThisBlock(name) &&
                !this.hasVariableBeenDeclaredThisBlock(name)
              ) {
                // If this variable isn't used eventually,
                // and it hasn't been declared yet, then
                // we can turn this assignment into a "let"
                // statement.
                statementsUpdated.push(
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

                this.blockDeclaredVariables[name] = true;
                continue;
              }
            }
          }

          statementsUpdated.push(statement);
          continue;
        }

        case "VariableDeclaration": {
          if (statement.declarations.length === 1) {
            let { id, init } = statement.declarations[0];
            if (types.isIdentifier(id)) {
              if (!this.isVariableUsedLater(id.name)) {
                // if (expressionHasSideEffects(init)) {
                //   statementsUpdated.push(types.expressionStatement(init));
                // }
                // continue;
              }
            }
          }

          statementsUpdated.push(
            types.variableDeclaration(
              "let",
              statement.declarations.map((declarator) => {
                for (let identifier of getIdentifiersLValUses(declarator.id)) {
                  this.blockDeclaredVariables[identifier.id.name] = true;
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
          statementsUpdated.push(statement);
          continue;

        case "EmptyStatement":
          continue;
      }

      console.log("moveDeclarations() needs statement", statement);

      statementsUpdated.push(statement);
      this.index += 1;
    }

    this.body = statementsUpdated;
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
