import * as types from "@babel/types";
export default class Scope {
	vars: {
		[name: string]: {

		}
	};
	parent?: Scope

	constructor() {
		
	}

	isVarDefined(name: string) {
		return !!this.vars[name];
	}

	defineVar(name: string) {
		this.vars[name] = {};
	}

	hoist(statements: types.Statement[]) {
		for (let statement of statements) {
			switch (statement.type) {
				case "VariableDeclaration":
					for (let declarator of statement.declarations) {
						
					}
			}
		}
	}
}
