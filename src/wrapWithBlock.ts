import * as types from "@babel/types";
import Preambleable from "./Preambleable";

export default function wrapWithBlock(
  statement: Preambleable<types.Statement>
): types.BlockStatement {
  let statementValue = statement.value ? [statement.value] : [];

  // prevent wrapping BlockStatements in BlockStatements
  if (statement.value && statement.value.type === "BlockStatement") {
    return statement.value;
  } else {
    return types.blockStatement([...statement.preamble, ...statementValue]);
  }
}
