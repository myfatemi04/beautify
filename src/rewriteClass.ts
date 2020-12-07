import * as types from "@babel/types";
import Preambleable from "./Preambleable";
import { rewriteBlockStatement } from "./rewriteBlockStatement";
import { rewriteExpression } from "./rewriteExpression";
import { Scope } from "./scope";

export function rewriteClassMethod(
  expression: types.ClassMethod | types.ClassPrivateMethod,
  scope: Scope
): types.ClassMethod | types.ClassPrivateMethod {
  return {
    ...expression,
    body: rewriteBlockStatement(expression.body, scope),
  };
}

export function rewriteClassPrivateProperty(
  property: types.ClassPrivateProperty,
  scope: Scope
): Preambleable<types.ClassPrivateProperty> {
  let { preamble, value } = rewriteExpression(property.value, scope);

  return {
    preamble,
    value: types.classPrivateProperty(
      property.key,
      value,
      property.decorators,
      property.static
    ),
  };
}

export function rewriteClassProperty(
  property: types.ClassProperty,
  scope: Scope
): Preambleable<types.ClassProperty> {
  let { preamble, value } = rewriteExpression(property.value, scope);

  return {
    preamble,
    value: types.classProperty(property.key, value),
  };
}

export function rewriteClassBody(
  expression_: types.ClassBody,
  scope: Scope
): types.ClassBody {
  let body = [];
  for (let expression of expression_.body) {
    if (
      expression.type === "ClassMethod" ||
      expression.type === "ClassPrivateMethod"
    ) {
      body.push(rewriteClassMethod(expression, scope));
    } else if (expression.type === "ClassProperty") {
      let { preamble, value } = rewriteClassProperty(expression, scope);
      body.push(...preamble, value);
    } else if (expression.type === "ClassPrivateProperty") {
      let { preamble, value } = rewriteClassPrivateProperty(expression, scope);
      body.push(...preamble, value);
    } else {
      // tsDeclareMethod, tsIndexSignature
      body.push(expression, scope);
    }
  }

  return {
    ...expression_,
    body,
  };
}

export function rewriteClassExpression(
  expression: types.ClassExpression,
  scope: Scope
): types.ClassExpression {
  return types.classExpression(
    expression.id,
    expression.superClass,
    rewriteClassBody(expression.body, scope),
    expression.decorators
  );
}

export function rewriteClassDeclaration(
  expression: types.ClassDeclaration,
  scope: Scope
): types.ClassDeclaration {
  return types.classDeclaration(
    expression.id,
    expression.superClass,
    rewriteClassBody(expression.body, scope),
    expression.decorators
  );
}
