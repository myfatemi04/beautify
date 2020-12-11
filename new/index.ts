import { parse } from "@babel/parser";
import * as fs from "fs";
import { Block } from "./Statement";

let file = fs.readFileSync("./in.js", {encoding: "utf8"});
let ast = parse(file);

console.log(Block.fromBabel(ast.program.body));
