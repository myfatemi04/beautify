import * as types from "@babel/types";
import getRootNodeOfMemberExpression from "./getRootNodeOfMemberExpression";

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

    case "Identifier":
      return [{ type: "get", id: expression }];

    case "BinaryExpression":
    case "LogicalExpression":
      // left before right
      return combine(
        getIdentifiersExpressionUses(expression.left),
        getIdentifiersExpressionUses(expression.right)
      );

    case "CallExpression":
      // callee before arguments
      return combine(
        getIdentifiersExpressionUses(expression.callee),
        getIdentifiersExpressionsUse(expression.arguments)
      );

    case "ArrayExpression":
      return getIdentifiersExpressionsUse(expression.elements);

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
      return [];
  }

  console.log("Reached unknown type:", expression.type);

  return [];
}

export function getIdentifiersStatementUses(
  statement: types.Statement
): IdentifierAccess[] {
  switch (statement.type) {
    case "ExpressionStatement": {
      return getIdentifiersExpressionUses(statement.expression);
    }
    case "BlockStatement": {
      return getIdentifiersStatementsUse(statement.body);
    }
    case "IfStatement": {
      return combine(
        getIdentifiersExpressionUses(statement.test),
        getIdentifiersStatementUses(statement.consequent),
        getIdentifiersStatementUses(statement.alternate)
      );
    }
  }

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
) {
  let identifiers = [];
  for (let declaration of declaration_.declarations) {
    identifiers = combine(
      identifiers,
      getIdentifiersExpressionUses(declaration.init)
    );
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
  }

  console.warn("Unhandled statement type:", statement);

  return [];
}
