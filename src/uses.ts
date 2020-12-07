import * as types from "@babel/types";
import { createLogicalAnd } from "typescript";
import { FunctionParam } from "./params";

/*

This file takes care of knowing if an identifier's initial value has been used or not.
It takes care of patterns (object destructuring), default values in functions, function parameters, function bodies...

*/

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

export function getIdentifiersPatternUses(
  pattern: types.Pattern
): IdentifierAccess[] {
  if (pattern.type === "ArrayPattern") {
    return getIdentifiersArrayPatternUses(pattern);
  } else if (pattern.type === "ObjectPattern") {
    return getIdentifiersObjectPatternUses(pattern);
  } else if (pattern.type === "AssignmentPattern") {
    return getIdentifiersAssignmentPatternUses(pattern);
  } else {
    throw new Error("Unexpected pattern:" + pattern);
  }
}

export function getIdentifiersPatternLikeUses(
  patternLike: types.PatternLike
): IdentifierAccess[] {
  if (patternLike.type === "RestElement") {
    return getIdentifiersLValUses(patternLike.argument);
  } else if (patternLike.type === "Identifier") {
    return [{ type: "set", id: patternLike }];
  } else {
    return getIdentifiersPatternUses(patternLike);
  }
}

export function getIdentifiersObjectPropertyUses(
  property: types.ObjectProperty
): IdentifierAccess[] {
  // "computed" is for things like { [a]: b }
  // if it's not computed, don't mistakenly call it an identifier
  let identifiers: IdentifierAccess[] = [];
  if (property.computed) {
    identifiers.push(...getIdentifiersExpressionUses(property.key));
  }

  if (types.isPatternLike(property.value)) {
    identifiers.push(...getIdentifiersPatternLikeUses(property.value));
  } else {
    identifiers.push(...getIdentifiersExpressionUses(property.value));
  }

  return identifiers;
}

function combine(...infos: IdentifierAccess[][]): IdentifierAccess[] {
  return [].concat(...infos);
}

export function getIdentifiersPrivateNameUses(
  expression: types.PrivateName
): IdentifierAccess[] {
  return [{ type: "set", id: expression.id }];
}

export function getIdentifiersMemberExpressionUses(
  expression: types.MemberExpression
): IdentifierAccess[] {
  let identifiers: IdentifierAccess[] = [];
  identifiers.push(...getIdentifiersExpressionUses(expression.object));

  if (types.isPrivateName(expression.property)) {
    identifiers.push(...getIdentifiersPrivateNameUses(expression.property));
  } else {
    identifiers.push(...getIdentifiersExpressionUses(expression.property));
  }

  return identifiers;
}

export function getIdentifiersExpressionUses(
  expression:
    | types.Expression
    | types.SpreadElement
    | types.V8IntrinsicIdentifier
    | types.JSXNamespacedName
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
    case "LogicalExpression": {
      let identifiers = [];
      if (types.isPrivateName(expression.left)) {
        identifiers.push(...getIdentifiersPrivateNameUses(expression.left));
      } else {
        identifiers.push(...getIdentifiersExpressionUses(expression.left));
      }

      identifiers.push(...getIdentifiersExpressionUses(expression.right));

      return identifiers;
    }

    case "CallExpression":
    case "NewExpression": {
      // callee before arguments

      let identifiers = combine(
        getIdentifiersExpressionUses(expression.callee),
        getIdentifiersExpressionsUse(expression.arguments)
      );

      return identifiers;
    }

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
      // Get all identifiers of the left hand side.
      let identifiers: IdentifierAccess[] = [];
      identifiers.push(...getIdentifiersLValUses(expression.left));
      identifiers.push(...getIdentifiersExpressionUses(expression.right));
      return identifiers;
    }

    case "MemberExpression":
      return getIdentifiersMemberExpressionUses(expression);

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
      let identifiers: IdentifierAccess[] = [];

      identifiers.push(...getIdentifiersFunctionParamsUse(expression.params));

      if (types.isExpression(expression.body)) {
        identifiers.push(...getIdentifiersExpressionUses(expression.body));
      } else if (types.isStatement(expression.body)) {
        identifiers.push(...getIdentifiersStatementUses(expression.body));
      }

      return identifiers;
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
    if (types.isPattern(param)) {
      // Pattern-like: all of the identifiers area "set"
      identifiers.push(...getIdentifiersPatternUses(param));
    } else if (types.isIdentifier(param)) {
      // Identifier: this identifier is "set" (instantiated from the function)
      identifiers.push({ type: "set", id: param });
    } else if (types.isRestElement(param)) {
      // Rest element: whatever content in the Rest Element is "set"
      identifiers.push(...getIdentifiersRestElementUses(param));
    } else if (types.isTSParameterProperty(param)) {
      // TS Parameter [e.g. constructor(private a: string)]
      // The param can be an identifier or assignment pattern and is treated
      // like it were a regular function parameter.
      if (types.isIdentifier(param)) {
        identifiers.push({ type: "set", id: param });
      } else if (types.isAssignmentPattern(param)) {
        identifiers.push(...getIdentifiersAssignmentPatternUses(param));
      } else {
        throw new Error("Invalid TS Parameter Property: " + param);
      }
    } else {
      throw new Error("Invalid function parameter: " + param);
    }
  }

  return identifiers;
}

export function getIdentifiersRestElementUses(
  element: types.RestElement
): IdentifierAccess[] {
  return getIdentifiersLValUses(element.argument);
}

/**
 * Takes the right side, says it is being used as a default value.
 * Takes the left side, says it is being updated.
 * @param pattern Things like: constructor(a = b): This is like a default value
 */
export function getIdentifiersAssignmentPatternUses(
  pattern: types.AssignmentPattern
): IdentifierAccess[] {
  let identifiers: IdentifierAccess[] = [];

  // the left value: we are setting any identifiers found here
  identifiers.push(...getIdentifiersLValUses(pattern.left));

  // the default value: we are using any identifiers found here
  identifiers.push(...getIdentifiersExpressionUses(pattern.right));

  return identifiers;
}

/**
 * Says any identifiers being assigned to here are "set"
 * @param lval The left side of an assignment
 */
export function getIdentifiersLValUses(lval: types.LVal): IdentifierAccess[] {
  if (types.isPatternLike(lval)) {
    return getIdentifiersPatternLikeUses(lval);
  } else if (lval.type === "MemberExpression") {
    return getIdentifiersExpressionUses(lval);
  } else if (lval.type === "TSParameterProperty") {
    return getIdentifiersLValUses(lval.parameter);
  } else {
    throw new Error("Invalid lval type for lval" + JSON.stringify(lval));
  }
}

/*
 * PATTERNS
 * These are the object destructuring things. Any identifiers found here are "set".
 */

export function getIdentifiersArrayPatternUses(
  pattern: types.ArrayPattern
): IdentifierAccess[] {
  let identifiers: IdentifierAccess[] = [];

  for (let element of pattern.elements) {
    identifiers.push(...getIdentifiersLValUses(element));
  }

  return identifiers;
}

export function getIdentifiersObjectPatternUses(
  pattern: types.ObjectPattern
): IdentifierAccess[] {
  let identifiers: IdentifierAccess[] = [];

  for (let property of pattern.properties) {
    if (property.type === "ObjectProperty") {
      if (types.isPatternLike(property.value)) {
        identifiers.push(...getIdentifiersPatternLikeUses(property.value));
      } else {
        identifiers.push(...getIdentifiersExpressionUses(property.value));
      }
    } else if (property.type === "RestElement") {
      identifiers.push(...getIdentifiersRestElementUses(property));
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

export function getIdentifiersClassMethodUses(
  method: types.ClassMethod | types.ClassPrivateMethod
): IdentifierAccess[] {
  let identifiers: IdentifierAccess[] = [];

  for (let param of method.params) {
    if (types.isPatternLike(param)) {
      identifiers.push(...getIdentifiersPatternLikeUses(param));
    } else if (param.type === "TSParameterProperty") {
      // TS Parameter [e.g. constructor(private a: string)]
      // The param can be an identifier or assignment pattern and is treated
      // like it were a regular function parameter.
      if (types.isIdentifier(param)) {
        identifiers.push({ type: "set", id: param });
      } else if (types.isAssignmentPattern(param)) {
        identifiers.push(...getIdentifiersAssignmentPatternUses(param));
      } else {
        throw new Error("Invalid TS Parameter Property: " + param);
      }
    }
  }

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

    case "WhileStatement":
    case "DoWhileStatement": {
      return combine(
        getIdentifiersExpressionUses(statement.test),
        getIdentifiersStatementUses(statement.body)
      );
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

/*

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
      if (statement.argument) {
        return getIdentifiersExpressionUses(statement.argument);
      } else {
        return [];
      }

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

*/
