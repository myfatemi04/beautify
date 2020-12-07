import * as types from "@babel/types";
import Preambleable from "./Preambleable";
import { rewriteExpressionsAndConcat } from "./rewriteExpression";
import { rewriteSpreadElement } from "./rewriteSpreadElement";
import { rewriteScopedStatementArray } from "./rewriteStatementArray";
import { Scope } from "./scope";

export function rewriteObjectMethod(
  objectMethod: types.ObjectMethod,
  scope: Scope
): types.ObjectMethod {
  let body = rewriteScopedStatementArray(objectMethod.body.body, scope);
  return types.objectMethod(
    objectMethod.kind,
    objectMethod.key,
    objectMethod.params,
    types.blockStatement(body)
  );
}

export function rewriteObjectExpression(
  expression: types.ObjectExpression,
  scope: Scope
): Preambleable<types.ObjectExpression> {
  let preamble: types.Statement[] = [];
  let properties: Array<
    types.ObjectMethod | types.ObjectProperty | types.SpreadElement
  > = [];

  for (let property of expression.properties) {
    if (property.type === "SpreadElement") {
      let { preamble, value } = rewriteSpreadElement(property, scope);
      preamble.push(...preamble);
      properties.push(value);
    } else if (property.type === "ObjectMethod") {
      properties.push(rewriteObjectMethod(property, scope));
    } else if (property.type === "ObjectProperty") {
      let key = rewriteExpressionsAndConcat(property.key, scope, preamble);
      let value = property.value;

      if (types.isPattern(value) || types.isRestElement(value)) {
      } else {
        value = rewriteExpressionsAndConcat(value, scope, preamble);
      }

      properties.push(types.objectProperty(key, value));
    }
  }

  return {
    preamble,
    value: types.objectExpression(properties),
  };
}
