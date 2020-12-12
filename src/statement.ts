import * as types from "@babel/types";

import { getIdentifiersExpressionUses } from "./expression";
import { getIdentifiersVariableDeclarationUses } from "./variableDeclaration";
import {
  concat,
  createIdentifierAccess,
  IdentifierAccess_,
} from "./IdentifierAccess";
import { rewriteBlockStatement } from "./blockStatement";
import { rewriteExpressionStatement } from "./expressionStatement";
import {
  rewriteForStatement,
  rewriteForOfInStatement,
  getIdentifiersForOfInStatementUses,
  getIdentifiersForStatementUses,
} from "./forStatement";
import {
  getIdentifiersFunctionDeclarationUses,
  rewriteFunctionDeclaration,
} from "./functionDeclaration";
import {
  getIdentifiersIfStatementUses,
  rewriteIfStatement,
} from "./ifStatement";
import { rewriteLabeledStatement } from "./labeledStatement";
import {
  getIdentifiersClassDeclarationUses,
  rewriteClassDeclaration,
} from "./classDeclaration";
import {
  getIdentifiersReturnStatementUses,
  rewriteReturnStatement,
} from "./returnStatement";
import {
  getIdentifiersSwitchStatementUses,
  rewriteSwitchStatement,
} from "./switchStatement";
import {
  getIdentifiersTryStatementUses,
  rewriteTryStatement,
} from "./tryStatement";
import { rewriteVariableDeclaration } from "./variableDeclaration";
import {
  getIdentifiersWhileDoWhileStatementUses,
  rewriteDoWhileStatement,
  rewriteWhileStatement,
} from "./whileDoWhile";
import { PathNode } from "./path";
import {
  getIdentifiersThrowStatementUses,
  rewriteThrowStatement,
} from "./throwStatement";
import { removeDefinedIdentifiers } from "./removeDefinedIdentifiers";

export function getIdentifiersStatementsUse(
  statements: types.Statement[]
): IdentifierAccess_ {
  return concat(
    ...statements.map((statement) => {
      return getIdentifiersStatementUses(statement);
    })
  );
}

export function getIdentifiersStatementUses(
  statement: types.Statement | types.CatchClause
): IdentifierAccess_ {
  switch (statement.type) {
    case "ForInStatement":
    case "ForOfStatement":
      return getIdentifiersForOfInStatementUses(statement);

    case "ForStatement":
      return getIdentifiersForStatementUses(statement);

    case "SwitchStatement":
      return getIdentifiersSwitchStatementUses(statement);

    case "ExpressionStatement":
      return getIdentifiersExpressionUses(statement.expression);

    case "LabeledStatement":
      return getIdentifiersStatementUses(statement.body);

    case "BlockStatement":
      return removeDefinedIdentifiers(
        getIdentifiersStatementsUse(statement.body)
      );

    case "IfStatement":
      return getIdentifiersIfStatementUses(statement);

    case "WhileStatement":
    case "DoWhileStatement":
      return getIdentifiersWhileDoWhileStatementUses(statement);

    case "ClassDeclaration":
      return getIdentifiersClassDeclarationUses(statement);

    case "ReturnStatement":
      return getIdentifiersReturnStatementUses(statement);

    case "FunctionDeclaration":
      return getIdentifiersFunctionDeclarationUses(statement);

    case "TryStatement":
      return getIdentifiersTryStatementUses(statement);

    case "ThrowStatement":
      return getIdentifiersThrowStatementUses(statement);

    case "VariableDeclaration":
      return getIdentifiersVariableDeclarationUses(statement);

    case "BreakStatement":
    case "ContinueStatement":
    case "EmptyStatement":
      return createIdentifierAccess();
  }

  console.warn("getIdentifiersStatementUses() needs case", statement);

  return createIdentifierAccess();
}

export function rewriteStatement(
  statement: types.Statement,
  path: PathNode
): types.Statement[] {
  switch (statement.type) {
    case "ExpressionStatement":
      return rewriteExpressionStatement(statement, path);
    case "ForStatement":
      return rewriteForStatement(statement, path);
    case "BlockStatement":
      return [rewriteBlockStatement(statement, path)];
    case "IfStatement":
      return rewriteIfStatement(statement, path);
    case "FunctionDeclaration":
      return [rewriteFunctionDeclaration(statement, path)];
    case "ReturnStatement":
      return rewriteReturnStatement(statement, path);
    case "VariableDeclaration":
      return rewriteVariableDeclaration(statement, path);
    case "ClassDeclaration":
      return [rewriteClassDeclaration(statement, path)];
    case "SwitchStatement":
      return [rewriteSwitchStatement(statement, path)];
    case "TryStatement":
      return [rewriteTryStatement(statement, path)];
    case "ThrowStatement":
      return [rewriteThrowStatement(statement, path)];
    case "ForInStatement":
    case "ForOfStatement":
      return [rewriteForOfInStatement(statement, path)];
    case "DoWhileStatement":
      return [rewriteDoWhileStatement(statement, path)];
    case "LabeledStatement":
      return [rewriteLabeledStatement(statement, path)];
    case "WhileStatement":
      return [rewriteWhileStatement(statement, path)];
    case "ContinueStatement":
    case "BreakStatement":
      return [statement];
    case "EmptyStatement":
      return [];
  }

  console.warn("rewriteStatement() needs case", statement.type);

  return [statement];
}

export function rewriteStatementWrapWithBlock(
  statement: types.Statement,
  path: PathNode
): types.BlockStatement {
  let statement_ = rewriteStatement(statement, path);
  if (statement_.length == 1) {
    if (types.isBlockStatement(statement_[0])) {
      return statement_[0];
    }
  }
  return types.blockStatement(statement_);
}
