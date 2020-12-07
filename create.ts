import * as types from "@babel/types";
import BASE_NODE from "./base_node";

export function createNull(): types.NullLiteral {
  return {
    ...BASE_NODE,
    type: "NullLiteral",
  };
}

export function createIdentifier(name: string): types.Identifier {
  return {
    ...BASE_NODE,
    decorators: undefined,
    optional: undefined,
    typeAnnotation: undefined,
    type: "Identifier",
    name,
  };
}

export function createVariableDeclarationFromDeclarator(
  kind: "var" | "let" | "const",
  declarator: types.VariableDeclarator
): types.VariableDeclaration {
  return {
    ...BASE_NODE,
    type: "VariableDeclaration",
    kind,
    declare: false,
    declarations: [declarator],
  };
}

export function createEmptyVariableDeclaration(kind: "var" | "let" | "const", name: string, definite: boolean = false) {
	return createVariableDeclarationFromDeclarator(kind, {
		...BASE_NODE,
		type: "VariableDeclarator",
		id: createIdentifier(name),
		init: undefined,
		definite
	});
}

export function createUndefined(): types.Identifier {
  return createIdentifier("undefined");
}
