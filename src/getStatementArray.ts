import * as types from "@babel/types";

export default function getStatementArray(
  statement: types.Statement
): types.Statement[] {
  if (statement.type === "BlockStatement") {
    return statement.body;
  } else {
    return [statement];
  }
}
