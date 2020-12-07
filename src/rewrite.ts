import * as types from "@babel/types";

import Preambleable, {
  addPreamble,
  ExpressionNoPreamble,
} from "./Preambleable";

import negateExpression from "./negate";
import wrapWithBlock from "./wrapWithBlock";
import { hoistAll, Scope } from "./scope";

import { rewriteStatementArrayVarsAsAssignments } from "./rewriteVarAsAssignment";
import createHoistedVariableDeclarations from "./createHoistedDeclarations";
import hasSpecialCharacters from "./hasSpecialCharacters";
import { moveDeclarationsInward } from "./moveDeclarations";

export function beautifyNegatedNumericLiteral(
  literal: types.NumericLiteral
): types.BooleanLiteral {
  return types.booleanLiteral(literal.value === 0);
}

export function beautifyConditionalExpressionStatement(
  expression: types.ConditionalExpression,
  scope: Scope
): Preambleable<types.IfStatement> {
  return createIfStatement(
    expression.test,
    types.expressionStatement(expression.consequent),
    types.expressionStatement(expression.alternate),
    scope
  );
}

export function rewriteAndReduce(
  scope: Scope,
  ...expressions: types.Expression[]
): [preamble: types.Statement[], members: types.Expression[]] {
  let preamble = [];
  let members = [];
  for (let expression of expressions) {
    members.push(rewriteAndConcat(expression, scope, preamble));
  }

  return [preamble, members];
}

export function rewriteNegatedUnaryExpressionArgument(
  argument: types.Expression,
  scope: Scope
): Preambleable<types.Expression> {
  if (argument.type === "NumericLiteral") {
    // Convert !0 to true, and !1 to false.
    return addPreamble(beautifyNegatedNumericLiteral(argument));
  } else if (argument.type === "CallExpression") {
    // Remove "!" before (function(){})()
    return rewriteExpression(argument, scope);
  } else {
    let { preamble, value } = rewriteExpression(argument, scope);
    return {
      preamble,
      value: types.unaryExpression("!", value),
    };
  }
}

export function rewriteUnaryExpression(
  expression: types.UnaryExpression,
  scope: Scope
): Preambleable<types.UnaryExpression | types.Expression> {
  if (expression.operator === "!") {
    return rewriteNegatedUnaryExpressionArgument(expression.argument, scope);
  } else if (expression.operator === "void") {
    if (expression.argument.type === "NumericLiteral") {
      if (expression.argument.value === 0) {
        return addPreamble(types.identifier("undefined"));
      }
    }
  }

  return addPreamble(expression);
}

export function rewriteCallExpression(
  expression: types.CallExpression,
  scope: Scope
): Preambleable<types.CallExpression> {
  let preamble = [];
  let args = [];
  for (let arg of expression.arguments) {
    if (
      arg.type === "SpreadElement" ||
      arg.type === "JSXNamespacedName" ||
      arg.type === "ArgumentPlaceholder"
    ) {
      args.push(arg);
    } else {
      args.push(rewriteAndConcat(arg, scope, preamble));
    }
  }

  let calleeExpression = expression.callee;
  if (expression.callee.type !== "V8IntrinsicIdentifier") {
    let rewrittenCallee = rewriteExpression(expression.callee, scope);
    preamble = preamble.concat(rewrittenCallee.preamble);
    calleeExpression = rewrittenCallee.value;
  }

  return {
    preamble,
    value: types.callExpression(calleeExpression, args),
  };
}

export function rewriteAssignmentExpression(
  expression: types.AssignmentExpression,
  scope: Scope
): Preambleable<types.AssignmentExpression | types.UpdateExpression> {
  let rightIsOne = false;
  if (expression.right.type === "NumericLiteral") {
    if (expression.right.value === 1) {
      rightIsOne = true;
    }
  }

  // replace "+= 1" with "++".
  if (rightIsOne && types.isIdentifier(expression.left)) {
    if (expression.operator === "+=") {
      return addPreamble(types.updateExpression("++", expression.left, true));
    } else if (expression.operator === "-=") {
      return addPreamble(types.updateExpression("--", expression.left, true));
    }
  }

  let [preamble, [right]] = rewriteAndReduce(scope, expression.right);

  return {
    preamble,
    value: types.assignmentExpression("=", expression.left, right),
  };
}

export function rewriteSpreadElement(
  spreadElement: types.SpreadElement,
  scope: Scope
): Preambleable<types.SpreadElement> {
  let { preamble, value } = rewriteExpression(spreadElement.argument, scope);
  return {
    preamble,
    value: types.spreadElement(value),
  };
}

export function rewriteObjectMethod(
  objectMethod: types.ObjectMethod,
  scope: Scope
): types.ObjectMethod {
  let body = rewriteScopedStatementArray(objectMethod.body.body, scope);
  return types.objectMethod(
    objectMethod.kind,
    objectMethod.key,
    objectMethod.params,
    types.blockStatement(body)
  );
}

export function rewriteObjectExpression(
  expression: types.ObjectExpression,
  scope: Scope
): Preambleable<types.ObjectExpression> {
  let preamble = [];
  let properties: Array<
    types.ObjectMethod | types.ObjectProperty | types.SpreadElement
  > = [];

  for (let property of expression.properties) {
    if (property.type === "SpreadElement") {
      let { preamble, value } = rewriteSpreadElement(property, scope);
      preamble.push(...preamble);
      properties.push(value);
    } else if (property.type === "ObjectMethod") {
      properties.push(rewriteObjectMethod(property, scope));
    } else if (property.type === "ObjectProperty") {
      let key = rewriteAndConcat(property.key, scope, preamble);
      let value = property.value;

      if (
        [
          "Identifier",
          "RestElement",
          "AssignmentPattern",
          "ArrayPattern",
          "ObjectPattern",
        ].includes(value.type)
      ) {
      } else {
        // @ts-ignore
        value = rewriteAndConcat(value, preamble);
      }

      properties.push({
        type: "ObjectProperty",
        ...property,
        key,
        value,
      });
    }
  }

  return {
    preamble,
    value: types.objectExpression(properties),
  };
}

export function rewriteFunctionExpression(
  expression: types.FunctionExpression,
  scope: Scope
): types.ArrowFunctionExpression {
  // Rewrite as arrow expression
  return types.arrowFunctionExpression(
    expression.params,
    types.blockStatement(
      rewriteScopedStatementArray(expression.body.body, scope)
    )
  );
}

export function rewriteArrayExpression(
  expression: types.ArrayExpression,
  scope: Scope
): Preambleable<types.ArrayExpression> {
  let preamble = [];
  let newElements = [];
  for (let element of expression.elements) {
    if (element.type === "SpreadElement") {
      newElements.push(element);
    } else {
      newElements.push(rewriteAndConcat(element, scope, preamble));
    }
  }

  return {
    preamble,
    value: types.arrayExpression(newElements),
  };
}

export function rewriteConditionalExpression(
  expression: types.ConditionalExpression,
  scope: Scope
): Preambleable<types.ConditionalExpression> {
  let { test, consequent, alternate } = expression;

  let testRewritten = rewriteExpression(test, scope);
  let consequentRewritten = rewriteExpression(consequent, scope);
  let alternateRewritten = rewriteExpression(alternate, scope);

  let preamble = [].concat(
    testRewritten.preamble,
    consequentRewritten.preamble,
    alternateRewritten.preamble
  );

  return {
    preamble,
    value: types.conditionalExpression(
      testRewritten.value,
      consequentRewritten.value,
      alternateRewritten.value
    ),
  };
}

/**
 * When given an expression using ==, ===, !==, !=, >, <, >=, <=, etc,
 * rewrite both sides of the expression (it's safe, both sides get calculated.)
 * @param expression Binary expression to rewrite
 */
export function rewriteBinaryExpression(
  expression: types.BinaryExpression,
  scope: Scope
): Preambleable<types.BinaryExpression> {
  let preamble = [];
  let { left, right, operator } = expression;

  if (left.type !== "PrivateName")
    left = rewriteAndConcat(left, scope, preamble);

  right = rewriteAndConcat(right, scope, preamble);

  return {
    preamble,
    value: types.binaryExpression(operator, left, right),
  };
}

/**
 * When given an expression like A.B, rewrite the base member.
 * @param expression Member expression to rewrite
 */
export function rewriteMemberExpression(
  expression: types.MemberExpression,
  scope: Scope
): Preambleable<types.MemberExpression> {
  let preamble = [];
  let object = rewriteAndConcat(expression.object, scope, preamble);
  let property = expression.property;
  if (expression.property.type !== "PrivateName") {
    property = rewriteAndConcat(expression.property, scope, preamble);
  }

  let computed = expression.computed;
  // Rewrite things like a["b"] to a.b
  if (property.type === "StringLiteral") {
    if (!hasSpecialCharacters(property.value)) {
      property = types.identifier(property.value);
      computed = false;
    }
  }

  return {
    preamble,
    value: types.memberExpression(
      object,
      property,
      computed,
      expression.optional
    ),
  };
}

export function rewriteOptionalMemberExpression(
  expression: types.OptionalMemberExpression,
  scope: Scope
): Preambleable<types.OptionalMemberExpression> {
  let preamble = [];
  let object = rewriteAndConcat(expression.object, scope, preamble);
  let property = rewriteAndConcat(expression.property, scope, preamble);

  return {
    preamble,
    value: types.optionalMemberExpression(
      object,
      property,
      expression.computed,
      expression.optional
    ),
  };
}

/**
 * When given an expression like A + B or A * B, rewrite both members.
 * @param expression Arithmetic expression to rewrite
 */
export function rewriteNewExpression(
  expression: types.NewExpression,
  scope: Scope
): Preambleable<types.NewExpression> {
  let callee = expression.callee;
  let preamble: types.Statement[] = [];
  if (callee.type !== "V8IntrinsicIdentifier") {
    callee = rewriteAndConcat(callee, scope, preamble);
  }

  return {
    preamble,
    value: types.newExpression(callee, expression.arguments),
  };
}

export function rewriteClassMethod(
  expression: types.ClassMethod | types.ClassPrivateMethod,
  scope: Scope
): types.ClassMethod | types.ClassPrivateMethod {
  return {
    ...expression,
    body: rewriteBlockStatement(expression.body, scope),
  };
}

export function rewriteClassProperty(
  expression: types.ClassProperty | types.ClassPrivateProperty,
  scope: Scope
): types.ClassProperty | types.ClassPrivateProperty {
  let [preamble, [value]] = rewriteAndReduce(scope, expression.value);

  return {
    ...expression,
    value,
  };
}

export function rewriteClassBody(
  expression_: types.ClassBody,
  scope: Scope
): types.ClassBody {
  let body = [];
  for (let expression of expression_.body) {
    if (
      expression.type === "ClassMethod" ||
      expression.type === "ClassPrivateMethod"
    ) {
      body.push(rewriteClassMethod(expression, scope));
    } else if (
      expression.type === "ClassProperty" ||
      expression.type === "ClassPrivateProperty"
    ) {
      body.push(rewriteClassProperty(expression, scope));
    } else {
      body.push(expression, scope);
    }
  }

  return {
    ...expression_,
    body,
  };
}

export function rewriteClassExpression(
  expression: types.ClassExpression,
  scope: Scope
): types.ClassExpression {
  return types.classExpression(
    expression.id,
    expression.superClass,
    rewriteClassBody(expression.body, scope),
    expression.decorators
  );
}

export function rewriteClassDeclaration(
  expression: types.ClassDeclaration,
  scope: Scope
): types.ClassDeclaration {
  return types.classDeclaration(
    expression.id,
    expression.superClass,
    rewriteClassBody(expression.body, scope),
    expression.decorators
  );
}

export function rewriteArrowFunctionExpression(
  expression: types.ArrowFunctionExpression,
  scope: Scope
): types.ArrowFunctionExpression {
  if (types.isExpression(expression.body)) {
    return types.arrowFunctionExpression(
      expression.params,
      rewriteExpression(expression.body, scope).value
    );
  } else {
    return types.arrowFunctionExpression(
      expression.params,
      wrapWithBlock(rewriteStatement(expression.body, scope))
    );
  }
}

export function rewriteLogicalExpression(
  expression: types.LogicalExpression,
  scope: Scope
): Preambleable<types.LogicalExpression> {
  let [preamble, [left, right]] = rewriteAndReduce(
    scope,
    expression.left,
    expression.right
  );
  return {
    preamble,
    value: types.logicalExpression(expression.operator, left, right),
  };
}

export function rewriteExpressionNoPreamble(
  expression: ExpressionNoPreamble,
  scope: Scope
): ExpressionNoPreamble {
  if (types.isLiteral(expression)) {
    return expression;
  }

  if (types.isClassExpression(expression)) {
    return rewriteClassExpression(expression, scope);
  }

  if (types.isArrowFunctionExpression(expression)) {
    return rewriteArrowFunctionExpression(expression, scope);
  }

  if (types.isFunctionExpression(expression)) {
    return rewriteFunctionExpression(expression, scope);
  }

  if (types.isUpdateExpression(expression)) {
    return expression;
  }

  if (
    expression.type === "Identifier" ||
    expression.type === "ThisExpression"
  ) {
    return expression;
  }

  console.log("Unseen expression type:", expression.type);

  return expression;
}

export function rewriteExpression(
  expression: types.Expression,
  scope: Scope
): Preambleable<types.Expression> {
  switch (expression.type) {
    case "ConditionalExpression":
      return rewriteConditionalExpression(expression, scope);
    case "UnaryExpression":
      return rewriteUnaryExpression(expression, scope);
    case "SequenceExpression":
      return rewriteSequenceExpression(expression, scope);
    case "CallExpression":
      return rewriteCallExpression(expression, scope);
    case "AssignmentExpression":
      return rewriteAssignmentExpression(expression, scope);
    case "ObjectExpression":
      return rewriteObjectExpression(expression, scope);
    case "ArrayExpression":
      return rewriteArrayExpression(expression, scope);
    case "BinaryExpression":
      return rewriteBinaryExpression(expression, scope);
    case "MemberExpression":
      return rewriteMemberExpression(expression, scope);
    case "OptionalMemberExpression":
      return rewriteOptionalMemberExpression(expression, scope);
    case "NewExpression":
      return rewriteNewExpression(expression, scope);
    case "LogicalExpression":
      return rewriteLogicalExpression(expression, scope);
    case "ParenthesizedExpression":
      return rewriteExpression(expression.expression, scope);
  }

  return addPreamble(rewriteExpressionNoPreamble(expression, scope));
}

export function rewriteLogicalExpressionAsIfStatement(
  expression: types.LogicalExpression,
  scope: Scope
): Preambleable<types.IfStatement> {
  if (expression.operator == "&&") {
    return createIfStatement(
      expression.left,
      types.expressionStatement(expression.right),
      undefined,
      scope
    );
  } else if (expression.operator === "||") {
    return createIfStatement(
      negateExpression(expression.left),
      types.expressionStatement(expression.right),
      undefined,
      scope
    );
  } else {
    expression.operator === "??";
    return createIfStatement(
      types.binaryExpression("!=", expression.left, types.nullLiteral()),
      types.expressionStatement(expression.right),
      undefined,
      scope
    );
  }
}

export function createIfStatement(
  test: types.Expression,
  consequent: types.Statement,
  alternate: types.Statement,
  scope: Scope
): Preambleable<types.IfStatement> {
  return rewriteIfStatement(
    types.ifStatement(test, consequent, alternate),
    scope
  );
}

export function rewriteSequenceExpression(
  sequence: types.SequenceExpression,
  scope: Scope
): Preambleable<types.SequenceExpression | types.Expression> {
  let expressions = sequence.expressions;
  if (expressions.length > 0) {
    let preambleExpressions = expressions.slice(0, expressions.length - 1);
    let preambleStatements: types.ExpressionStatement[] = preambleExpressions.map(
      (expression) => types.expressionStatement(expression)
    );

    let preamble: types.Statement[] = [];
    for (let statement of preambleStatements) {
      let {
        preamble: preamble_,
        value: statement_,
      } = rewriteExpressionStatement(statement, scope);

      preamble = preamble.concat(preamble_);
      preamble.push(statement_);
    }

    let expression = expressions[expressions.length - 1];
    let rewrittenExpression = rewriteExpression(expression, scope);
    preamble = preamble.concat(rewrittenExpression.preamble);
    expression = rewrittenExpression.value;

    return {
      preamble,
      value: expression,
    };
  } else {
    return addPreamble(sequence);
  }
}

export function rewriteExpressionStatement(
  statement: types.ExpressionStatement,
  scope: Scope
): Preambleable<types.ExpressionStatement | types.IfStatement> {
  let expression = statement.expression;
  switch (expression.type) {
    case "ConditionalExpression":
      return beautifyConditionalExpressionStatement(expression, scope);
    case "LogicalExpression": {
      return rewriteLogicalExpressionAsIfStatement(expression, scope);
    }
    default: {
      let { preamble, value } = rewriteExpression(expression, scope);

      return {
        preamble,
        value: types.expressionStatement(value),
      };
    }
  }
}

export function rewriteAndConcat(
  expression: types.Expression,
  scope: Scope,
  preamble: types.Statement[] = []
) {
  let { preamble: pre, value } = rewriteExpression(expression, scope);
  preamble.push(...pre);
  return value;
}

export function rewriteForStatement(
  statement: types.ForStatement,
  scope: Scope
): Preambleable<types.ForStatement> {
  let preamble = [];
  let init = undefined;
  let test = statement.test;

  if (statement.init) {
    if (statement.init.type === "VariableDeclaration") {
      let { preamble: preamble_ } = rewriteVariableDeclaration(
        statement.init,
        scope
      );
      if (preamble_.length > 0) {
        init = preamble_[preamble_.length - 1];
        preamble = preamble.concat(preamble_.slice(0, preamble_.length - 1));
      }
    } else {
      init = rewriteAndConcat(statement.init, scope, preamble);
    }
  }

  if (statement.test) {
    test = rewriteAndConcat(statement.test, scope, preamble);
  }

  return {
    preamble,
    value: types.forStatement(
      init,
      test,
      statement.update,
      wrapWithBlock(rewriteStatement(statement.body, scope))
    ),
  };
}

export function rewriteIfStatement(
  statement: types.IfStatement,
  scope: Scope
): Preambleable<types.IfStatement> {
  let test = statement.test;
  let preamble = [];

  test = rewriteAndConcat(test, scope, preamble);

  let consequent = statement.consequent;
  let alternate = statement.alternate;

  if (consequent) {
    consequent = wrapWithBlock(rewriteStatement(consequent, scope));
  }

  if (alternate) {
    alternate = wrapWithBlock(rewriteStatement(alternate, scope));
  }

  return {
    preamble,
    value: types.ifStatement(test, consequent, alternate),
  };
}

export function rewriteBlockStatement(
  statement: types.BlockStatement,
  scope: Scope
): types.BlockStatement {
  return types.blockStatement(rewriteStatementArray(statement.body, scope));
}

export function rewriteReturnStatement(
  statement: types.ReturnStatement,
  scope: Scope
): Preambleable<types.ReturnStatement | types.IfStatement> {
  if (!statement.argument) {
    return addPreamble(statement);
  } else {
    if (statement.argument.type === "ConditionalExpression") {
      let { test, consequent, alternate } = statement.argument;

      return createIfStatement(
        test,
        types.returnStatement(consequent),
        types.returnStatement(alternate),
        scope
      );
    }

    let { preamble, value } = rewriteExpression(statement.argument, scope);
    return {
      preamble,
      value: types.returnStatement(value),
    };
  }
}

export function rewriteFunctionDeclaration(
  declaration: types.FunctionDeclaration,
  scope: Scope
): types.FunctionDeclaration {
  return types.functionDeclaration(
    declaration.id,
    declaration.params,
    types.blockStatement(
      rewriteScopedStatementArray(declaration.body.body, scope)
    )
  );
}

export function rewriteSwitchCase(
  case_: types.SwitchCase,
  scope: Scope
): types.SwitchCase {
  // preambles are NOT allowed
  // if test = undefined, it's a "default" case
  let test = case_.test
    ? rewriteExpression(case_.test, scope).value
    : undefined;
  let consequent = rewriteStatementArray(case_.consequent, scope);

  return types.switchCase(test, consequent);
}

export function rewriteSwitchStatement(
  statement: types.SwitchStatement,
  scope: Scope
): Preambleable<types.SwitchStatement> {
  let [preamble, [discriminant]] = rewriteAndReduce(
    scope,
    statement.discriminant
  );
  let cases = statement.cases.map((case_) => rewriteSwitchCase(case_, scope));
  return {
    preamble,
    value: types.switchStatement(discriminant, cases),
  };
}

export function rewriteCatchClause(
  clause: types.CatchClause,
  scope: Scope
): types.CatchClause {
  return {
    ...clause,
    body: rewriteBlockStatement(clause.body, scope),
  };
}

export function rewriteLabeledStatement(
  statement: types.LabeledStatement,
  scope: Scope
): types.LabeledStatement {
  return {
    ...statement,
    body: wrapWithBlock(rewriteStatement(statement.body, scope)),
  };
}

export function rewriteTryStatement(
  statement: types.TryStatement,
  scope: Scope
): types.TryStatement {
  let block = rewriteBlockStatement(statement.block, scope);
  let handler = statement.handler
    ? rewriteCatchClause(statement.handler, scope)
    : undefined;
  let finalizer = statement.finalizer
    ? rewriteBlockStatement(statement.finalizer, scope)
    : undefined;

  return types.tryStatement(block, handler, finalizer);
}

export function rewriteThrowStatement(
  statement: types.ThrowStatement,
  scope: Scope
): Preambleable<types.ThrowStatement> {
  let [preamble, [argument]] = rewriteAndReduce(scope, statement.argument);
  return {
    preamble,
    value: types.throwStatement(argument),
  };
}

export function rewriteForOfInStatement(
  statement: types.ForOfStatement | types.ForInStatement,
  scope: Scope
): Preambleable<types.ForInStatement | types.ForOfStatement> {
  let preamble = [];
  let rewrittenBody = rewriteStatement(statement.body, scope);
  let right = rewriteAndConcat(statement.right, scope, preamble);

  return {
    preamble,
    value: {
      ...statement,
      body: rewrittenBody.value,
      right,
    },
  };
}

export function rewriteDoWhileStatement(
  statement: types.DoWhileStatement,
  scope: Scope
): types.DoWhileStatement {
  let body = wrapWithBlock(rewriteStatement(statement.body, scope));

  // If there's something in the test, add it to the end of the loop
  let test = rewriteAndConcat(statement.test, scope, body.body);
  return types.doWhileStatement(test, body);
}

export function rewriteWhileStatement(
  statement: types.WhileStatement,
  scope: Scope
): Preambleable<types.WhileStatement> {
  let body = wrapWithBlock(rewriteStatement(statement.body, scope));
  let testRewritten = rewriteExpression(statement.test, scope);
  let test = testRewritten.value;
  let preamble = [];

  // If there's a preamble in the test, add before the while loop
  // and at the end of the block
  if (testRewritten.preamble) {
    preamble = testRewritten.preamble;
    body.body = body.body.concat(testRewritten.preamble);
  }

  return {
    preamble,
    value: types.whileStatement(test, body),
  };
}

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

export function rewriteVariableDeclaration(
  statement: types.VariableDeclaration,
  scope: Scope
): Preambleable<types.VariableDeclaration> {
  let declarations: types.Statement[] = [];
  for (let declarator of statement.declarations) {
    let init = declarator.init;
    if (init) {
      init = rewriteAndConcat(init, scope, declarations);
    }

    declarations.push(
      types.variableDeclaration(statement.kind, [
        types.variableDeclarator(declarator.id, declarator.init),
      ])
    );
  }

  return {
    preamble: declarations,
    value: undefined,
  };
}

export function rewriteStatementArray(
  statements: types.Statement[],
  scope: Scope
) {
  let statements_: types.Statement[] = [];
  for (let statement of statements) {
    let { preamble, value: statement_ } = rewriteStatement(statement, scope);

    statements_ = statements_.concat(preamble);

    if (statement_) {
      statements_.push(statement_);
    }
  }

  return statements_;
}

export function rewriteScopedStatementArray(
  body: types.Statement[],
  parent: Scope
): types.Statement[] {
  let scope: Scope = {
    vars: {},
    parent,
  };

  hoistAll(body, scope);
  body = rewriteStatementArrayVarsAsAssignments(body);

  let varDeclarations = createHoistedVariableDeclarations(
    Object.keys(scope.vars)
  );

  body = [...varDeclarations, ...body];
  body = rewriteStatementArray(body, scope);
  body = moveDeclarationsInward(body, scope);

  return body;
}
