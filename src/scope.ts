import * as types from "@babel/types";
import { getAllDeclaredIdentifiers } from "./getAllDeclaredIdentifiers";

export interface Scope {
	vars: {
    [name: string]: {};
  };
  parent?: Scope;
}

export function hoistAll(statements: types.Statement[], scope: Scope): void {
	for (let statement of statements) {
		hoist(statement, scope);
	}
}

export function hoist(statement: types.Statement, scope: Scope): void {
	if (statement == null) {
		return;
	}

	switch (statement.type) {
		case "VariableDeclaration":
			// Hoist "var" declarations
			if (statement.kind === "var") {
				let identifiers = getAllDeclaredIdentifiers(statement);

				for (let identifier of identifiers) {
					scope.vars[identifier.name] = true;
				}
			}
			break;

		case "BlockStatement":
			hoistAll(statement.body, scope);
			break;

		case "IfStatement":
			hoist(statement.consequent, scope);
			hoist(statement.alternate, scope);
			break;

		case "DoWhileStatement":
		case "WhileStatement":
			hoist(statement.body, scope);
			break;

		case "ForStatement":
			if (types.isVariableDeclaration(statement.init)) {
				hoist(statement.init, scope);
			}
			hoist(statement.body, scope);
			break;

		case "ForOfStatement":
		case "ForInStatement":
			if (types.isVariableDeclaration(statement.left)) {
				hoist(statement.left, scope);
			}
			hoist(statement.body, scope);
			break;
	}
}
