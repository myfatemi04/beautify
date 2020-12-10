import * as types from "@babel/types";
import { rewriteBlockStatement } from "./rewriteBlockStatement";
import { rewriteClassDeclaration } from "./rewriteClass";
import { rewriteExpressionStatement } from "./rewriteExpressionStatement";
import {
  rewriteForStatement,
  rewriteForOfInStatement,
} from "./rewriteForStatements";
import { rewriteFunctionDeclaration } from "./rewriteFunction";
import { rewriteIfStatement } from "./rewriteIfStatement";
import { rewriteLabeledStatement } from "./rewriteLabeledStatement";
import { rewriteReturnStatement } from "./rewriteReturnStatement";
import { rewriteSwitchStatement } from "./rewriteSwitch";
import {
  rewriteTryStatement,
  rewriteThrowStatement,
} from "./rewriteTryCatchThrow";
import { rewriteVariableDeclaration } from "./rewriteVariableDeclaration";
import {
  rewriteDoWhileStatement,
  rewriteWhileStatement,
} from "./rewriteWhileDoWhile";
import { Scope } from "./scope";

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

  console.log("UNSEEN STATEMENT TYPE:", statement.type);
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
