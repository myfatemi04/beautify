import * as types from "@babel/types";
import BASE_NODE from "./base_node";

export function createUndefined(): types.Identifier {
  return {
		...BASE_NODE,
		type: "Identifier",
		name: "undefined",
		decorators: null,
		optional: false,
		typeAnnotation: null,
	};
}

export function createNull(): types.NullLiteral {
  return {
    ...BASE_NODE,
    type: "NullLiteral",
  };
}