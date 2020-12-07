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
}