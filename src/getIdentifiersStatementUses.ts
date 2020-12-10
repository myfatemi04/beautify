import * as types from "@babel/types";
import { combine } from "./combine";
import { getIdentifiersClassMethodUses } from "./getIdentifersClassMethodUses";
import { getIdentifiersCatchClauseUses } from "./getIdentifiersCatchClauseUses";
import { getIdentifiersExpressionUses } from "./getIdentifiersExpressionUses";
import { getIdentifiersFunctionParamsUse } from "./getIdentifiersFunctionParamsUse";
import { getIdentifiersLValUses } from "./getIdentifiersLValUses";
import { getIdentifiersSwitchCaseUses } from "./getIdentifiersSwitchCaseUses";
import { getIdentifiersVariableDeclarationUses } from "./getIdentifiersVariableDeclarationUses";
import { IdentifierAccess } from "./IdentifierAccess";

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
