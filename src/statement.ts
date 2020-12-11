import * as types from "@babel/types";
import { combine } from "./combine";
import { getIdentifiersClassMethodUses } from "./classMethod";
import { getIdentifiersCatchClauseUses } from "./catchClause";
import { getIdentifiersExpressionUses } from "./expression";
import { getIdentifiersFunctionParamsUse } from "./functionParams";
import { getIdentifiersLValUses } from "./lval";
import { getIdentifiersSwitchCaseUses } from "./switchCase";
import { getIdentifiersVariableDeclarationUses } from "./variableDeclaration";
import { IdentifierAccess } from "./IdentifierAccess";
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
import { Scope } from "./scope";
import {
  getIdentifiersThrowStatementUses,
  rewriteThrowStatement,
} from "./throwStatement";

export function getIdentifiersStatementsUse(
  statements: types.Statement[]
): IdentifierAccess[] {
  return [].concat(
    ...statements.map((statement) => {
      return getIdentifiersStatementUses(statement) || [];
    })
  );
}

export function getIdentifiersStatementUses(
  statement: types.Statement | types.CatchClause
): IdentifierAccess[] {
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
      return getIdentifiersStatementsUse(statement.body);

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
      return [];
  }

  console.warn("getIdentifiersStatementUses() needs case", statement);

  return [];
}

export function rewriteStatement(
  statement: types.Statement,
  scope: Scope
): types.Statement[] {
  switch (statement.type) {
    case "ExpressionStatement":
      return rewriteExpressionStatement(statement, scope);
    case "ForStatement":
      return rewriteForStatement(statement, scope);
    case "BlockStatement":
      return [rewriteBlockStatement(statement, scope)];
    case "IfStatement":
      return rewriteIfStatement(statement, scope);
    case "FunctionDeclaration":
      return [rewriteFunctionDeclaration(statement, scope)];
    case "ReturnStatement":
      return rewriteReturnStatement(statement, scope);
    case "VariableDeclaration":
      return rewriteVariableDeclaration(statement, scope);
    case "ClassDeclaration":
      return [rewriteClassDeclaration(statement, scope)];
    case "SwitchStatement":
      return [rewriteSwitchStatement(statement, scope)];
    case "TryStatement":
      return [rewriteTryStatement(statement, scope)];
    case "ThrowStatement":
      return [rewriteThrowStatement(statement, scope)];
    case "ForInStatement":
    case "ForOfStatement":
      return [rewriteForOfInStatement(statement, scope)];
    case "DoWhileStatement":
      return [rewriteDoWhileStatement(statement, scope)];
    case "LabeledStatement":
      return [rewriteLabeledStatement(statement, scope)];
    case "WhileStatement":
      return [rewriteWhileStatement(statement, scope)];
    case "ContinueStatement":
    case "BreakStatement":
    case "EmptyStatement":
      return [statement];
  }

  console.warn("rewriteStatement() needs case", statement.type);

  return [statement];
}

export function rewriteStatementWrapWithBlock(
  statement: types.Statement,
  scope: Scope
): types.BlockStatement {
  let statement_ = rewriteStatement(statement, scope);
  if (statement_.length == 1) {
    if (types.isBlockStatement(statement_[0])) {
      return statement_[0];
    }
  }
  return types.blockStatement(statement_);
}
