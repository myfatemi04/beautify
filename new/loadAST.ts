import * as types from "@babel/types";
import { Block } from "./Statement";

export default function loadAST(program: types.Program) {
	let block = Block.fromBabel(program.body);
}