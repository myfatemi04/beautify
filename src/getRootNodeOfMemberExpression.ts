import * as types from "@babel/types";

export default function getRootNodeOfMemberExpression(
  expression: types.Expression
): types.Expression {
  if (expression.type === "MemberExpression") {
    return getRootNodeOfMemberExpression(expression.object);
  } else {
    return expression;
  }
}
