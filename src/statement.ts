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
import { rewriteForStatement, rewriteForOfInStatement } from "./forStatement";
import { rewriteFunctionDeclaration } from "./functionDeclaration";
import { rewriteIfStatement } from "./ifStatement";
import { rewriteLabeledStatement } from "./labeledStatement";
import { rewriteClassDeclaration } from "./classDeclaration";
import { rewriteReturnStatement } from "./returnStatement";
import { rewriteSwitchStatement } from "./switchStatement";
import { rewriteTryStatement } from "./tryStatement";
import { rewriteVariableDeclaration } from "./variableDeclaration";
import { rewriteDoWhileStatement, rewriteWhileStatement } from "./whileDoWhile";
import { Scope } from "./scope";
import { rewriteThrowStatement } from "./throwStatement";

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
    case "ForOfStatement": {
      let identifiers: IdentifierAccess[] = [];

      if (types.isLVal(statement.left)) {
        identifiers.push(...getIdentifiersLValUses(statement.left));
      } else {
        identifiers.push(
          ...getIdentifiersVariableDeclarationUses(statement.left)
        );
      }

      identifiers.push(...getIdentifiersStatementUses(statement.body));

      return identifiers;
    }

    case "ForStatement": {
      let identifiers = [];
      if (statement.init) {
        if (types.isExpression(statement.init)) {
          identifiers.push(...getIdentifiersExpressionUses(statement.init));
        } else {
          identifiers.push(
            ...getIdentifiersVariableDeclarationUses(statement.init)
          );
        }
      }

      if (statement.test) {
        identifiers.push(...getIdentifiersExpressionUses(statement.test));
      }

      if (statement.update) {
        identifiers.push(...getIdentifiersExpressionUses(statement.update));
      }

      identifiers.push(...getIdentifiersStatementUses(statement.body));

      return identifiers;
    }

    case "SwitchStatement": {
      types.assertSwitchStatement(statement);

      let identifiers: IdentifierAccess[] = [];
      identifiers.push(...getIdentifiersExpressionUses(statement.discriminant));

      for (let case_ of statement.cases) {
        identifiers.push(...getIdentifiersSwitchCaseUses(case_));
      }

      return identifiers;
    }

    case "ExpressionStatement": {
      return getIdentifiersExpressionUses(statement.expression);
    }

    case "LabeledStatement":
      return getIdentifiersStatementUses(statement.body);

    case "BlockStatement":
      return getIdentifiersStatementsUse(statement.body);

    case "IfStatement": {
      let identifiers = combine(
        getIdentifiersExpressionUses(statement.test),
        getIdentifiersStatementUses(statement.consequent)
      );

      if (statement.alternate) {
        identifiers.push(...getIdentifiersStatementUses(statement.alternate));
      }

      return identifiers;
    }

    case "WhileStatement":
    case "DoWhileStatement": {
      return [
        ...getIdentifiersExpressionUses(statement.test),
        ...getIdentifiersStatementUses(statement.body),
      ];
    }

    case "ClassDeclaration":
      return combine(
        statement.superClass
          ? getIdentifiersExpressionUses(statement.superClass)
          : [],
        ...statement.body.body.map((line) => {
          if (
            line.type === "TSDeclareMethod" ||
            line.type === "TSIndexSignature"
          ) {
            return [];
          } else if (line.type === "ClassMethod") {
            return getIdentifiersClassMethodUses(line);
          } else if (line.type === "ClassPrivateMethod") {
            return getIdentifiersClassMethodUses(line);
          } else if (line.type === "ClassProperty") {
            if (line.value) {
              return getIdentifiersExpressionUses(line.value);
            } else {
              return [];
            }
          } else if (line.type === "ClassPrivateProperty") {
            if (line.value) {
              return getIdentifiersExpressionUses(line.value);
            } else {
              return [];
            }
          } else {
            throw new Error("Invalid class body line " + line);
          }
        })
      );

    case "ReturnStatement":
      if (statement.argument) {
        return getIdentifiersExpressionUses(statement.argument);
      } else {
        return [];
      }

    case "FunctionDeclaration":
      return [
        ...getIdentifiersFunctionParamsUse(statement.params),
        ...getIdentifiersStatementUses(statement.body),
      ];

    case "TryStatement": {
      let identifiers = [];

      identifiers.push(...getIdentifiersStatementUses(statement.block));

      if (statement.handler) {
        identifiers.push(...getIdentifiersCatchClauseUses(statement.handler));
      }

      if (statement.finalizer) {
        identifiers.push(...getIdentifiersStatementUses(statement.finalizer));
      }

      return identifiers;
    }

    case "ThrowStatement":
      return getIdentifiersExpressionUses(statement.argument);

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
