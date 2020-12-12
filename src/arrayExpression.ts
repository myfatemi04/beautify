import * as types from "@babel/types";
import { getIdentifiersExpressionUses, rewriteExpression } from "./expression";
import {
  concat,
  createIdentifierAccess,
  IdentifierAccess_,
} from "./IdentifierAccess";
import { PathNode } from "./path";
import { getIdentifiersSpreadElementUses } from "./spreadElement";

export function rewriteArrayExpression(
  expression: types.ArrayExpression,
  path: PathNode
): types.ArrayExpression {
  return types.arrayExpression(
    expression.elements.map((element) => {
      if (element == null) {
        return null;
      } else if (element.type === "SpreadElement") {
        return element;
      } else {
        return rewriteExpression(element, path);
      }
    })
  );
}

export function getIdentifiersArrayExpressionUses(
  expression: types.ArrayExpression
): IdentifierAccess_ {
  // some elements in array expressions can be null; filter them out
  let identifiers: IdentifierAccess_ = createIdentifierAccess();
  for (let element of expression.elements) {
    if (element == null) {
      continue;
    }

    if (types.isExpression(element)) {
      identifiers = concat(identifiers, getIdentifiersExpressionUses(element));
    } else if (types.isSpreadElement(element)) {
      identifiers = concat(
        identifiers,
        getIdentifiersSpreadElementUses(element)
      );
    } else {
      throw new Error("ArrayExpression cannot have element " + element);
    }
  }

  return identifiers;
}
