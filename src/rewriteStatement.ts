import * as types from "@babel/types";
import Preambleable, { addPreamble } from "./Preambleable";
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
import wrapWithBlock from "./wrapWithBlock";

export function rewriteStatement(
  statement: types.Statement,
  scope: Scope
): Preambleable<types.Statement> {
  switch (statement.type) {
    case "ExpressionStatement":
      return rewriteExpressionStatement(statement, scope);
    case "ForStatement":
      return rewriteForStatement(statement, scope);
    case "BlockStatement":
      return addPreamble(rewriteBlockStatement(statement, scope));
    case "IfStatement":
      return rewriteIfStatement(statement, scope);
    case "FunctionDeclaration":
      return addPreamble(rewriteFunctionDeclaration(statement, scope));
    case "ReturnStatement":
      return rewriteReturnStatement(statement, scope);
    case "VariableDeclaration":
      return rewriteVariableDeclaration(statement, scope);
    case "ClassDeclaration":
      return addPreamble(rewriteClassDeclaration(statement, scope));
    case "SwitchStatement":
      return rewriteSwitchStatement(statement, scope);
    case "TryStatement":
      return addPreamble(rewriteTryStatement(statement, scope));
    case "ThrowStatement":
      return rewriteThrowStatement(statement, scope);
    case "ForInStatement":
    case "ForOfStatement":
      return rewriteForOfInStatement(statement, scope);
    case "DoWhileStatement":
      return addPreamble(rewriteDoWhileStatement(statement, scope));
    case "LabeledStatement":
      return addPreamble(rewriteLabeledStatement(statement, scope));
    case "WhileStatement":
      return rewriteWhileStatement(statement, scope);
    case "ContinueStatement":
    case "BreakStatement":
    case "EmptyStatement":
      return addPreamble(statement);
  }

  console.log("UNSEEN STATEMENT TYPE:", statement.type);
  return addPreamble(statement);
}

export function rewriteStatementWrapWithBlock(
  statement: types.Statement,
  scope: Scope
): types.BlockStatement {
  return wrapWithBlock(rewriteStatement(statement, scope));
}
