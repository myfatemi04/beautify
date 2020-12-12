import * as types from "@babel/types";
import {
  createIdentifierAccess,
  IdentifierAccess_,
  mergeIdentifiersOr,
} from "./IdentifierAccess";
import { PathNode } from "./path";
import { getIdentifiersStatementUses } from "./statement";
import { getIdentifiersVariableDeclarationUses } from "./variableDeclaration";

/**
 * Rewrites the body as an array of statements
 * @param statement Block statement to rewrite
 * @param path path
 */
export function rewriteBlockStatement(
  statement: types.BlockStatement,
  path: PathNode
): types.BlockStatement {
  let rewritten = new PathNode(statement.body, false, path);
  rewritten.rewrite();
  return types.blockStatement(rewritten.body);
}

export function getIdentifiersBlockStatementUses(
  statement_: types.BlockStatement
): IdentifierAccess_ {
  let identifiers = createIdentifierAccess();
  let defined = new Set<string>();
  for (let statement of statement_.body) {
    if (statement.type === "VariableDeclaration") {
      let used = getIdentifiersVariableDeclarationUses(statement);
      // if the value was retrieved before being set, add it to 'get'
      identifiers.get = mergeIdentifiersOr(identifiers.get, used.get);
      // now, add all variables that were defined
      used.set.forEach((id) => {
        defined.add(id);
      });
    } else {
      let used = getIdentifiersStatementUses(statement);

      used.get.forEach((id) => {
        if (!defined.has(id)) {
          identifiers.get.add(id);
        }
      });

      used.set.forEach((id) => {
        if (!defined.has(id)) {
          identifiers.set.add(id);
        }
      });
    }
  }

  return identifiers;
}
