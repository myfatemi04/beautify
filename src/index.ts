import * as fs from "fs";
import * as parser from "@babel/parser";
import generate from "@babel/generator";

import { rewriteScopedStatementArray } from "./statementArray";

let inputCode = fs.readFileSync("in.js", { encoding: "utf8" });

let { program } = parser.parse(inputCode);

let refactored = {
  ...program,
  body: rewriteScopedStatementArray(program.body, { vars: {} }),
};

let { code } = generate(refactored);

fs.writeFileSync("out.js", code, { encoding: "utf8" });
