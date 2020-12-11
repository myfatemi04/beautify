import * as fs from "fs";
import * as parser from "@babel/parser";
import generate from "@babel/generator";

import { PathNode } from "./path";

let infile = process.argv[2] || "in.js";
let outfile = process.argv[3] || "out.js";

let inputCode = fs.readFileSync(infile, { encoding: "utf8" });

let { program } = parser.parse(inputCode);

let rewriter = new PathNode(program.body, true);
rewriter.rewrite();

let refactored = {
  ...program,
  body: rewriter.body,
};

let { code } = generate(refactored);

fs.writeFileSync(outfile, code, { encoding: "utf8" });
