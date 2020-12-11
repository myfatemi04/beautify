import * as types from "@babel/types";
import { getAllDeclaredIdentifiers } from "./getAllDeclaredIdentifiers";

export class PathNode {
  body: types.Statement[];
  parent: PathNode | null;
  pathd: boolean;
  blockDeclaredVariables: { [name: string]: boolean } = {};
  suggestedVariableNames: { [name: string]: string } = {};

  constructor(body: types.Statement[], pathd: boolean, parent?: PathNode) {
    this.body = body;
    this.pathd = pathd;

    if (parent) {
      this.parent = parent;
    } else {
      this.parent = null;
    }
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
}

export function hoistAll(statements: types.Statement[], path: PathNode): void {
  for (let statement of statements) {
    hoist(statement, path);
  }
}

export function hoist(statement: types.Statement, path: PathNode): void {
  if (statement == null) {
    return;
  }

  switch (statement.type) {
    case "VariableDeclaration":
      // Hoist "var" declarations
      if (statement.kind === "var") {
        let identifiers = getAllDeclaredIdentifiers(statement);

        for (let identifier of identifiers) {
          path.blockDeclaredVariables[identifier.name] = true;
        }
      }
      break;

    case "BlockStatement":
      hoistAll(statement.body, path);
      break;

    case "IfStatement":
      hoist(statement.consequent, path);
      hoist(statement.alternate, path);
      break;

    case "DoWhileStatement":
    case "WhileStatement":
      hoist(statement.body, path);
      break;

    case "ForStatement":
      if (types.isVariableDeclaration(statement.init)) {
        hoist(statement.init, path);
      }
      hoist(statement.body, path);
      break;

    case "ForOfStatement":
    case "ForInStatement":
      if (types.isVariableDeclaration(statement.left)) {
        hoist(statement.left, path);
      }
      hoist(statement.body, path);
      break;
  }
}
