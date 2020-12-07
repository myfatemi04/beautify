import * as types from "@babel/types";
import expressionHasSideEffects from "./expressionHasSideEffects";
import getRootNodeOfMemberExpression from "./getRootNodeOfMemberExpression";
import { FunctionParam } from "./params";

type IdentifierAccess =
  | {
      type: "get";
      id: types.Identifier;
    }
  | {
      type: "set";
      id: types.Identifier;
    };

export function getIdentifiersExpressionsUse(
  expressions: (
    | types.Expression
    | types.SpreadElement
    | types.JSXNamespacedName
    | types.ArgumentPlaceholder
  )[]
): IdentifierAccess[] {
  let identifiers = expressions.map((element) => {
    if (element.type !== "ArgumentPlaceholder") {
      return getIdentifiersExpressionUses(element);
    } else {
      return [];
    }
  });

  return combine(...identifiers);
}

export function getIdentifiersObjectPropertyUses(
  property: types.ObjectProperty
): IdentifierAccess[] {
  // "computed" is for things like { [a]: b }
  // if it's not computed, don't mistakenly call it an identifier
  if (!property.computed) {
    return getIdentifiersExpressionUses(property.value);
  } else {
    return combine(
      getIdentifiersExpressionUses(property.key),
      getIdentifiersExpressionUses(property.value)
    );
  }
}

function combine(...infos: IdentifierAccess[][]): IdentifierAccess[] {
  return [].concat(...infos);
}

export function getIdentifiersParametersUses(
  expression: types.TypeParameter
): IdentifierAccess[] {
  return [];
}

export function getIdentifiersExpressionUses(
  expression:
    | types.Expression
    | types.SpreadElement
    | types.PrivateName
    | types.V8IntrinsicIdentifier
    | types.JSXNamespacedName
    | types.PatternLike
): IdentifierAccess[] {
  switch (expression.type) {
    case "SpreadElement":
    case "UnaryExpression":
      return getIdentifiersExpressionUses(expression.argument);

    case "UpdateExpression":
      if (expression.argument.type === "Identifier") {
        return [
          { type: "get", id: expression.argument },
          { type: "set", id: expression.argument },
        ];
      } else {
        return getIdentifiersExpressionUses(expression.argument);
      }

    case "SequenceExpression":
      return getIdentifiersExpressionsUse(expression.expressions);

    case "Identifier":
      return [{ type: "get", id: expression }];

    case "ConditionalExpression":
      return combine(
        getIdentifiersExpressionUses(expression.test),
        getIdentifiersExpressionUses(expression.consequent),
        getIdentifiersExpressionUses(expression.alternate)
      );

    case "BinaryExpression":
    case "LogicalExpression":
      // left before right
      return combine(
        getIdentifiersExpressionUses(expression.left),
        getIdentifiersExpressionUses(expression.right)
      );

    case "CallExpression":
    case "NewExpression":
      // callee before arguments
      return combine(
        getIdentifiersExpressionUses(expression.callee),
        getIdentifiersExpressionsUse(expression.arguments)
      );

    case "ArrayExpression":
      return getIdentifiersExpressionsUse(
        // some elements in array expressions can be null; filter them out
        expression.elements.filter((element) => element != null)
      );

    case "ObjectExpression": {
      let identifiers = [];
      for (let property of expression.properties) {
        if (property.type === "SpreadElement") {
          identifiers = combine(
            identifiers,
            getIdentifiersExpressionUses(property)
          );
        } else if (property.type === "ObjectProperty") {
          identifiers = combine(
            identifiers,
            getIdentifiersObjectPropertyUses(property)
          );
        }
      }
      return identifiers;
    }

    case "AssignmentExpression": {
      let lhs = expression.left;
      let identifiers: IdentifierAccess[] = [];
      if (lhs.type === "Identifier") {
        identifiers.push({ type: "set", id: lhs });
      } else if (lhs.type === "MemberExpression") {
        let object = getRootNodeOfMemberExpression(lhs.object);
        if (object.type === "Identifier") {
          identifiers.push({ type: "get", id: object });
        }
      }
      return combine(
        identifiers,
        getIdentifiersExpressionUses(expression.right)
      );
    }

    case "ArrayPattern":
      return combine(
        ...expression.elements.map((element) =>
          getIdentifiersExpressionUses(element)
        )
      );

    case "ObjectPattern":
      return [];

    case "AssignmentPattern": {
      return combine(
        getIdentifiersExpressionUses(expression.left),
        getIdentifiersExpressionUses(expression.right)
      );
    }

    case "MemberExpression": {
      return combine(
        getIdentifiersExpressionUses(expression.object),
        getIdentifiersExpressionUses(expression.property)
      );
    }

    case "RestElement": {
      if (expression.argument.type === "TSParameterProperty") {
        return [];
      } else {
        return getIdentifiersExpressionUses(expression.argument);
      }
    }

    case "BooleanLiteral":
    case "StringLiteral":
    case "BigIntLiteral":
    case "NumericLiteral":
    case "RegExpLiteral":
    case "DecimalLiteral":
    case "NullLiteral":
    case "ThisExpression":
      return [];

    case "ArrowFunctionExpression":
    case "FunctionExpression": {
      // TODO make this better-suited for scope changes
      let bodyIdentifiers: IdentifierAccess[] = [];
      if (types.isExpression(expression.body)) {
        bodyIdentifiers.push(...getIdentifiersExpressionUses(expression.body));
      } else if (types.isStatement(expression.body)) {
        bodyIdentifiers.push(...getIdentifiersStatementUses(expression.body));
      }

      return combine(
        getIdentifiersFunctionParamsUse(expression.params),
        bodyIdentifiers
      );
    }
  }

  console.warn("getIdentifiersExpressionUses() needs case", expression);

  return [];
}

export function getIdentifiersFunctionParamsUse(
  params: FunctionParam[]
): IdentifierAccess[] {
  let identifiers: IdentifierAccess[] = [];
  for (let param of params) {
    if (param.type === "Identifier") {
      identifiers.push({ type: "set", id: param });
    } else {
      identifiers.push(...getIdentifiersLValUses(param));
    }
  }

  return identifiers;
}

export function getIdentifiersRestElementUses(
  element: types.RestElement
): IdentifierAccess[] {
  return getIdentifiersLValUses(element.argument);
}

export function getIdentifiersAssignmentPatternUses(
  pattern: types.AssignmentPattern
): IdentifierAccess[] {
  let identifiers: IdentifierAccess[] = [];
  if (!types.isMemberExpression(pattern.left)) {
    let touches = getIdentifiersLValUses(pattern.left);
    for (let { id } of touches) {
      identifiers.push({ type: "set", id });
    }
  }

  identifiers.push(...getIdentifiersExpressionUses(pattern.right));

  return identifiers;
}

export function getIdentifiersLValUses(lval: types.LVal): IdentifierAccess[] {
  if (lval.type === "Identifier") {
    return [{ type: "get", id: lval }];
  } else if (lval.type === "ArrayPattern") {
    return getIdentifiersArrayPatternUses(lval);
  } else if (lval.type === "RestElement") {
    return getIdentifiersRestElementUses(lval);
  } else if (lval.type === "ObjectPattern") {
    return getIdentifiersObjectPatternUses(lval);
  } else if (lval.type === "MemberExpression") {
    return getIdentifiersExpressionUses(lval);
  } else if (lval.type === "AssignmentPattern") {
    return getIdentifiersAssignmentPatternUses(lval);
  } else if (lval.type === "TSParameterProperty") {
    return getIdentifiersLValUses(lval.parameter);
  } else {
    throw new Error("Invalid lval type for lval" + JSON.stringify(lval));
  }
}

export function getIdentifiersArrayPatternUses(
  pattern: types.ArrayPattern
): IdentifierAccess[] {
  let identifiers: IdentifierAccess[] = [];

  for (let element of pattern.elements) {
    identifiers.push(...getIdentifiersLValUses(element));
  }

  return identifiers;
}

// TODO make these all really robust
export function getIdentifiersObjectPatternUses(
  pattern: types.ObjectPattern
): IdentifierAccess[] {
  let identifiers: IdentifierAccess[] = [];

  for (let property of pattern.properties) {
    if (property.type === "ObjectProperty") {
      if (types.isPattern(property.value)) {
        identifiers.push(...getIdentifiersLValUses(property.value));
      } else {
        identifiers.push(...getIdentifiersExpressionUses(property.value));
      }
    }
  }

  return identifiers;
}

export function getIdentifiersSwitchCaseUses(
  statement: types.SwitchCase
): IdentifierAccess[] {
  let identifiers: IdentifierAccess[] = [];

  if (statement.test) {
    identifiers.push(...getIdentifiersExpressionUses(statement.test));
  }

  identifiers.push(...getIdentifiersStatementsUse(statement.consequent));

  return identifiers;
}

export function getIdentifiersCatchClauseUses(
  statement: types.CatchClause
): IdentifierAccess[] {
  let identifiers: IdentifierAccess[] = [];

  identifiers.push(...getIdentifiersFunctionParamsUse([statement.param]));
  identifiers.push(...getIdentifiersStatementUses(statement.body));

  return identifiers;
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

    case "ReturnStatement":
      if (statement.argument) {
        return getIdentifiersExpressionUses(statement.argument);
      } else {
        return [];
      }

    case "FunctionDeclaration":
      return combine(
        getIdentifiersFunctionParamsUse(statement.params),
        getIdentifiersStatementUses(statement.body)
      );

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

export function getIdentifiersStatementsUse(
  statements: types.Statement[]
): IdentifierAccess[] {
  return combine(
    ...statements.map((statement) => {
      return getIdentifiersStatementUses(statement) || [];
    })
  );
}

export function getIdentifiersVariableDeclarationUses(
  declaration_: types.VariableDeclaration
): IdentifierAccess[] {
  let identifiers: IdentifierAccess[] = [];
  for (let declaration of declaration_.declarations) {
    identifiers.push(...getIdentifiersLValUses(declaration.id));

    if (declaration.init) {
      identifiers.push(...getIdentifiersExpressionUses(declaration.init));
    }
  }

  return identifiers;
}

export function getIdentifiersStatementUsesExternally(
  statement: types.Statement
): IdentifierAccess[] {
  switch (statement.type) {
    case "ExpressionStatement":
      return getIdentifiersExpressionUses(statement.expression);

    case "VariableDeclaration":
      return getIdentifiersVariableDeclarationUses(statement);

    case "IfStatement":
      return getIdentifiersExpressionUses(statement.test);

    case "ForInStatement":
    case "ForOfStatement":
      return getIdentifiersExpressionUses(statement.right);

    case "ForStatement":
      if (types.isVariableDeclaration(statement.init)) {
        return combine(
          getIdentifiersVariableDeclarationUses(statement.init),
          getIdentifiersExpressionUses(statement.test)
        );
      } else {
        return combine(
          getIdentifiersExpressionUses(statement.init),
          getIdentifiersExpressionUses(statement.test)
        );
      }

    case "WhileStatement":
    case "DoWhileStatement":
      return getIdentifiersExpressionUses(statement.test);

    case "SwitchStatement":
      return getIdentifiersExpressionUses(statement.discriminant);

    case "ThrowStatement":
      return getIdentifiersExpressionUses(statement.argument);

    case "LabeledStatement":
    case "BlockStatement":
    case "ClassDeclaration":
    case "FunctionDeclaration":
      return [];

    case "ReturnStatement":
    case "BreakStatement":
    case "ContinueStatement":
    case "ClassDeclaration":
      return [];

    case "TryStatement":
      return [];
  }

  console.warn("getIdentifiersStatementUsesExternally() needs case", statement);

  return [];
}
