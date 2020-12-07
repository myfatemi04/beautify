import * as fs from "fs";
import * as parser from "@babel/parser";
import * as types from "@babel/types";

import generate from "@babel/generator";

import hoist from "./hoist";
import Preambleable, { addPreamble, ExpressionNoPreamble } from "./Preambleable";
import negateExpression from "./negate";

function rewriteNegatedUnaryNumericLiteral(
  literal: types.NumericLiteral
): types.BooleanLiteral {
  return types.booleanLiteral(literal.value === 0);
}

function rewriteConditionalExpressionStatement(
  expression: types.ConditionalExpression
): Preambleable<types.IfStatement> {
  return createIfStatement(
    expression.test,
    types.expressionStatement(expression.consequent),
    types.expressionStatement(expression.alternate)
  );
}

function rewriteAndReduce(
  ...expressions: types.Expression[]
): [preamble: types.Statement[], members: types.Expression[]] {
  let preamble = [];
  let members = [];
  for (let expression of expressions) {
    members.push(rewriteAndConcat(expression, preamble));
  }

  return [preamble, members];
}

function rewriteNegatedUnaryExpressionArgument(
  argument: types.Expression
): Preambleable<types.Expression> {
  if (argument.type === "NumericLiteral") {
    // Convert !0 to true, and !1 to false.
    return addPreamble(rewriteNegatedUnaryNumericLiteral(argument));
  } else if (argument.type === "CallExpression") {
    // Remove "!" before (function(){})()
    return rewriteExpression(argument);
  } else {
    let { preamble, value } = rewriteExpression(argument);
    return {
      preamble,
      value: types.unaryExpression("!", value),
    };
  }
}

function rewriteUnaryExpression(
  expression: types.UnaryExpression
): Preambleable<types.UnaryExpression | types.Expression> {
  if (expression.operator === "!") {
    return rewriteNegatedUnaryExpressionArgument(expression.argument);
  } else if (expression.operator === "void") {
    if (expression.argument.type === "NumericLiteral") {
      if (expression.argument.value === 0) {
        return addPreamble(types.identifier("undefined"));
      }
    }
  }

  return addPreamble(expression);
}

function rewriteCallExpression(
  expression: types.CallExpression
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
      args.push(rewriteAndConcat(arg, preamble));
    }
  }

  let calleeExpression = expression.callee;
  if (expression.callee.type !== "V8IntrinsicIdentifier") {
    let rewrittenCallee = rewriteExpression(expression.callee);
    preamble = preamble.concat(rewrittenCallee.preamble);
    calleeExpression = rewrittenCallee.value;
  }

  return {
    preamble,
    value: types.callExpression(calleeExpression, args),
  };
}

function rewriteAssignmentExpression(
  expression: types.AssignmentExpression
): Preambleable<types.AssignmentExpression> {
  let [preamble, [right]] = rewriteAndReduce(expression.right);

  return {
    preamble,
    value: {
      // Assignment expression
      ...expression,
      // Only rewrite the right side
      right: right,
    },
  };
}

function rewriteObjectExpression(
  expression: types.ObjectExpression
): Preambleable<types.ObjectExpression> {
  let preamble = [];
  let properties: Array<
    types.ObjectMethod | types.ObjectProperty | types.SpreadElement
  > = [];
  for (let property of expression.properties) {
    if (property.type === "SpreadElement") {
      properties.push(property);
    } else if (property.type === "ObjectMethod") {
      properties.push(property);
    } else if (property.type === "ObjectProperty") {
      let rewrittenKey = rewriteExpression(property.key);
      let key = rewrittenKey.value;
      let value = property.value;
      preamble = preamble.concat(rewrittenKey.preamble);

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

function rewriteFunctionExpression(
  expression: types.FunctionExpression
): Preambleable<types.FunctionExpression> {
  return {
    preamble: [],
    // just add the new body
    value: {
      ...expression,
      body: wrapWithBlock({
        preamble: rewriteScopedStatementBlock(expression.body.body),
        value: undefined,
      }),
    },
  };
}

function rewriteArrayExpression(
  expression: types.ArrayExpression
): Preambleable<types.ArrayExpression> {
  let preamble = [];
  let newElements = [];
  for (let element of expression.elements) {
    if (element.type === "SpreadElement") {
      newElements.push(element);
    } else {
      newElements.push(rewriteAndConcat(element, preamble));
    }
  }

  return {
    preamble,
    value: {
      ...expression,
      elements: newElements,
    },
  };
}

function rewriteConditionalExpression(
  expression: types.ConditionalExpression
): Preambleable<types.ConditionalExpression> {
  let { test, consequent, alternate } = expression;

  let testRewritten = rewriteExpression(test);
  let consequentRewritten = rewriteExpression(consequent);
  let alternateRewritten = rewriteExpression(alternate);

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
function rewriteBinaryExpression(
  expression: types.BinaryExpression
): Preambleable<types.BinaryExpression> {
  let preamble = [];
  let { left, right, operator } = expression;

  if (left.type !== "PrivateName") left = rewriteAndConcat(left, preamble);

  right = rewriteAndConcat(right, preamble);

  return {
    preamble,
    value: types.binaryExpression(operator, left, right),
  };
}

/**
 * When given an expression like A.B, rewrite the base member.
 * @param expression Member expression to rewrite
 */
function rewriteMemberExpression(
  expression: types.MemberExpression
): Preambleable<types.MemberExpression> {
  let preamble = [];
  let object = rewriteAndConcat(expression.object, preamble);
  let property = expression.property;
  if (expression.property.type !== "PrivateName") {
    property = rewriteAndConcat(expression.property, preamble);
  }

  return {
    preamble,
    value: types.memberExpression(
      object,
      property,
      expression.computed,
      expression.optional
    ),
  };
}

function rewriteOptionalMemberExpression(
  expression: types.OptionalMemberExpression
): Preambleable<types.OptionalMemberExpression> {
  let preamble = [];
  let object = rewriteAndConcat(expression.object, preamble);
  let property = rewriteAndConcat(expression.property, preamble);

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
function rewriteNewExpression(
  expression: types.NewExpression
): Preambleable<types.NewExpression> {
  let callee = expression.callee;
  let preamble: types.Statement[] = [];
  if (callee.type !== "V8IntrinsicIdentifier") {
    callee = rewriteAndConcat(callee, preamble);
  }

  return {
    preamble,
    value: {
      ...expression,
      callee,
    },
  };
}

function rewriteClassMethod(
  expression: types.ClassMethod | types.ClassPrivateMethod
): types.ClassMethod | types.ClassPrivateMethod {
  return {
    ...expression,
    body: rewriteBlockStatement(expression.body),
  };
}

function rewriteClassProperty(
  expression: types.ClassProperty | types.ClassPrivateProperty
): types.ClassProperty | types.ClassPrivateProperty {
  let [preamble, [value]] = rewriteAndReduce(expression.value);

  return {
    ...expression,
    value,
  };
}

function rewriteClassBody(expression_: types.ClassBody): types.ClassBody {
  let body = [];
  for (let expression of expression_.body) {
    if (
      expression.type === "ClassMethod" ||
      expression.type === "ClassPrivateMethod"
    ) {
      body.push(rewriteClassMethod(expression));
    } else if (
      expression.type === "ClassProperty" ||
      expression.type === "ClassPrivateProperty"
    ) {
      body.push(rewriteClassProperty(expression));
    } else {
      body.push(expression);
    }
  }

  return {
    ...expression_,
    body,
  };
}

function rewriteClassExpression(
  expression: types.ClassExpression
): types.ClassExpression {
  return types.classExpression(
    expression.id,
    expression.superClass,
    rewriteClassBody(expression.body),
    expression.decorators
  );
}

function rewriteClassDeclaration(
  expression: types.ClassDeclaration
): types.ClassDeclaration {
  return types.classDeclaration(
    expression.id,
    expression.superClass,
    rewriteClassBody(expression.body),
    expression.decorators
  );
}

function rewriteArrowFunctionExpression(
  expression: types.ArrowFunctionExpression
): types.ArrowFunctionExpression {
  if (types.isExpression(expression.body)) {
    return types.arrowFunctionExpression(
      expression.params,
      rewriteExpression(expression.body).value
    );
  } else {
    return types.arrowFunctionExpression(
      expression.params,
      wrapWithBlock(rewriteStatement(expression.body))
    );
  }
}

function rewriteLogicalExpression(
  expression: types.LogicalExpression
): Preambleable<types.LogicalExpression> {
  let [preamble, [left, right]] = rewriteAndReduce(
    expression.left,
    expression.right
  );
  return {
    preamble,
    value: {
      ...expression,
      left,
      right,
    },
  };
}

function rewriteExpressionNoPreamble(
  expression: ExpressionNoPreamble
): ExpressionNoPreamble {
  if (types.isLiteral(expression)) {
    return expression;
  }

  if (types.isClassExpression(expression)) {
    return rewriteClassExpression(expression);
  }

  if (types.isArrowFunctionExpression(expression)) {
    return rewriteArrowFunctionExpression(expression);
  }

  if (types.isUpdateExpression(expression)) {
    return expression;
  }

  console.log("Unseen expression type:", expression.type);

  return expression;
}

function rewriteExpression(
  expression: types.Expression
): Preambleable<types.Expression> {
  switch (expression.type) {
    case "ConditionalExpression":
      return rewriteConditionalExpression(expression);
    case "UnaryExpression":
      return rewriteUnaryExpression(expression);
    case "SequenceExpression":
      return rewriteSequenceExpression(expression);
    case "CallExpression":
      return rewriteCallExpression(expression);
    case "AssignmentExpression":
      return rewriteAssignmentExpression(expression);
    case "ObjectExpression":
      return rewriteObjectExpression(expression);
    case "FunctionExpression":
      return rewriteFunctionExpression(expression);
    case "ArrayExpression":
      return rewriteArrayExpression(expression);
    case "BinaryExpression":
      return rewriteBinaryExpression(expression);
    case "MemberExpression":
      return rewriteMemberExpression(expression);
    case "OptionalMemberExpression":
      return rewriteOptionalMemberExpression(expression);
    case "NewExpression":
      return rewriteNewExpression(expression);
    case "LogicalExpression":
      return rewriteLogicalExpression(expression);
    case "ParenthesizedExpression":
      return rewriteExpression(expression.expression);
  }

  return addPreamble(rewriteExpressionNoPreamble(expression));
}

function rewriteLogicalExpressionAsIfStatement(
  expression: types.LogicalExpression
): Preambleable<types.IfStatement> {
  if (expression.operator == "&&") {
    return createIfStatement(
      expression.left,
      types.expressionStatement(expression.right),
      undefined
    );
  } else if (expression.operator === "||") {
    return createIfStatement(
      negateExpression(expression.left),
      types.expressionStatement(expression.right),
      undefined
    );
  } else if (expression.operator === "??") {
    return createIfStatement(
      types.binaryExpression("!=", expression.left, types.nullLiteral()),
      types.expressionStatement(expression.right),
      undefined
    );
  }
}

function createIfStatement(
  test: types.Expression,
  consequent: types.Statement,
  alternate: types.Statement
): Preambleable<types.IfStatement> {
  return rewriteIfStatement(types.ifStatement(test, consequent, alternate));
}

function rewriteSequenceExpression(
  sequence: types.SequenceExpression
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
      } = rewriteExpressionStatement(statement);

      preamble = preamble.concat(preamble_);
      preamble.push(statement_);
    }

    let expression = expressions[expressions.length - 1];
    let rewrittenExpression = rewriteExpression(expression);
    preamble = preamble.concat(rewrittenExpression.preamble);
    expression = rewrittenExpression.value;

    return {
      preamble,
      value: expression,
    };
  }
}

function rewriteExpressionStatement(
  statement: types.ExpressionStatement
): Preambleable<types.ExpressionStatement | types.IfStatement> {
  let expression = statement.expression;
  switch (expression.type) {
    case "ConditionalExpression":
      return rewriteConditionalExpressionStatement(expression);
    case "LogicalExpression": {
      return rewriteLogicalExpressionAsIfStatement(expression);
    }
    default: {
      let { preamble, value } = rewriteExpression(expression);
      return {
        preamble,
        value: types.expressionStatement(value),
      };
    }
  }
}

function wrapWithBlock(
  statement: Preambleable<types.Statement>
): types.BlockStatement {
  let statementValue = statement.value ? [statement.value] : [];

  // prevent wrapping BlockStatements in BlockStatements
  if (statement.value && statement.value.type === "BlockStatement") {
    return statement.value;
  } else {
    return types.blockStatement([...statement.preamble, ...statementValue]);
  }
}

function rewriteAndConcat(
  expression: types.Expression,
  preamble: types.Statement[] = []
) {
  let { preamble: pre, value } = rewriteExpression(expression);
  preamble.push(...pre);
  return value;
}

function rewriteForStatement(
  statement: types.ForStatement
): Preambleable<types.ForStatement> {
  let preamble = [];
  let init = undefined;
  let test = statement.test;

  if (statement.init) {
    if (statement.init.type === "VariableDeclaration") {
      let { preamble: preamble_ } = rewriteVariableDeclaration(statement.init);
      if (preamble_.length > 0) {
        init = preamble_[preamble_.length - 1];
        preamble = preamble.concat(preamble_.slice(0, preamble_.length - 1));
      }
    } else {
      init = rewriteAndConcat(statement.init, preamble);
    }
  }

  if (statement.test) {
    test = rewriteAndConcat(statement.test, preamble);
  }

  return {
    preamble,
    value: types.forStatement(
      init,
      test,
      statement.update,
      wrapWithBlock(rewriteStatement(statement.body))
    ),
  };
}

function rewriteIfStatement(
  statement: types.IfStatement
): Preambleable<types.IfStatement> {
  let test = statement.test;
  let preamble = [];

  test = rewriteAndConcat(test, preamble);

  let consequent = statement.consequent;
  let alternate = statement.alternate;

  if (consequent) {
    consequent = wrapWithBlock(rewriteStatement(consequent));
  }

  if (alternate) {
    alternate = wrapWithBlock(rewriteStatement(alternate));
  }

  return {
    preamble,
    value: types.ifStatement(test, consequent, alternate),
  };
}

function rewriteBlockStatement(
  statement: types.BlockStatement
): types.BlockStatement {
  return types.blockStatement(
    rewriteStatementArrayAsStatementArray(statement.body)
  );
}

function rewriteReturnStatement(
  statement: types.ReturnStatement
): Preambleable<types.ReturnStatement | types.IfStatement> {
  if (!statement.argument) {
    return addPreamble(statement);
  } else {
    if (statement.argument.type === "ConditionalExpression") {
      let { test, consequent, alternate } = statement.argument;

      return createIfStatement(
        test,
        types.returnStatement(consequent),
        types.returnStatement(alternate)
      );
    }

    let { preamble, value } = rewriteExpression(statement.argument);
    return {
      preamble,
      value: types.returnStatement(value),
    };
  }
}

function rewriteFunctionDeclaration(
  statement: types.FunctionDeclaration
): Preambleable<types.Statement> {
  return {
    preamble: [],
    value: types.functionDeclaration(
      statement.id,
      statement.params,
      wrapWithBlock({
        preamble: rewriteScopedStatementBlock(statement.body.body),
        value: undefined,
      })
    ),
  };
}

function rewriteSwitchCase(case_: types.SwitchCase): types.SwitchCase {
  // preambles are NOT allowed
  // if test = undefined, it's a "default" case
  let test = case_.test ? rewriteExpression(case_.test).value : undefined;
  let consequent = rewriteStatementArrayAsStatementArray(case_.consequent);

  return types.switchCase(test, consequent);
}

function rewriteSwitchStatement(
  statement: types.SwitchStatement
): Preambleable<types.SwitchStatement> {
  let [preamble, [discriminant]] = rewriteAndReduce(statement.discriminant);
  let cases = statement.cases.map((case_) => rewriteSwitchCase(case_));
  return {
    preamble,
    value: types.switchStatement(discriminant, cases),
  };
}

function rewriteCatchClause(clause: types.CatchClause): types.CatchClause {
  return {
    ...clause,
    body: rewriteBlockStatement(clause.body),
  };
}

function rewriteLabeledStatement(
  statement: types.LabeledStatement
): types.LabeledStatement {
  return {
    ...statement,
    body: wrapWithBlock(rewriteStatement(statement.body)),
  };
}

function rewriteTryStatement(
  statement: types.TryStatement
): types.TryStatement {
  let block = rewriteBlockStatement(statement.block);
  let handler = statement.handler
    ? rewriteCatchClause(statement.handler)
    : undefined;
  let finalizer = statement.finalizer
    ? rewriteBlockStatement(statement.finalizer)
    : undefined;

  return types.tryStatement(block, handler, finalizer);
}

function rewriteThrowStatement(
  statement: types.ThrowStatement
): Preambleable<types.ThrowStatement> {
  let [preamble, [argument]] = rewriteAndReduce(statement.argument);
  return {
    preamble,
    value: types.throwStatement(argument),
  };
}

function rewriteForOfInStatement(
  statement: types.ForOfStatement | types.ForInStatement
): Preambleable<types.ForInStatement | types.ForOfStatement> {
  let body = wrapWithBlock(rewriteStatement(statement.body));
  let [preamble, [right]] = rewriteAndReduce(statement.right);

  return {
    preamble,
    value: {
      ...statement,
      body,
      right,
    },
  };
}

function rewriteDoWhileStatement(
  statement: types.DoWhileStatement
): types.DoWhileStatement {
  let body = wrapWithBlock(rewriteStatement(statement.body));

  // If there's something in the test, add it to the end of the loop
  let test = rewriteAndConcat(statement.test, body.body);
  return types.doWhileStatement(test, body);
}

function rewriteWhileStatement(
  statement: types.WhileStatement
): Preambleable<types.WhileStatement> {
  let body = wrapWithBlock(rewriteStatement(statement.body));
  let testRewritten = rewriteExpression(statement.test);
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

function rewriteStatement(
  statement: types.Statement
): Preambleable<types.Statement> {
  switch (statement.type) {
    case "ExpressionStatement":
      return rewriteExpressionStatement(statement);
    case "ForStatement":
      return rewriteForStatement(statement);
    case "BlockStatement":
      return addPreamble(rewriteBlockStatement(statement));
    case "IfStatement":
      return rewriteIfStatement(statement);
    case "FunctionDeclaration":
      return rewriteFunctionDeclaration(statement);
    case "ReturnStatement":
      return rewriteReturnStatement(statement);
    case "VariableDeclaration":
      return rewriteVariableDeclaration(statement);
    case "ClassDeclaration":
      return addPreamble(rewriteClassDeclaration(statement));
    case "SwitchStatement":
      return rewriteSwitchStatement(statement);
    case "TryStatement":
      return addPreamble(rewriteTryStatement(statement));
    case "ThrowStatement":
      return rewriteThrowStatement(statement);
    case "ForInStatement":
    case "ForOfStatement":
      return rewriteForOfInStatement(statement);
    case "DoWhileStatement":
      return addPreamble(rewriteDoWhileStatement(statement));
    case "LabeledStatement":
      return addPreamble(rewriteLabeledStatement(statement));
    case "WhileStatement":
      return rewriteWhileStatement(statement);
    case "ContinueStatement":
    case "BreakStatement":
    case "EmptyStatement":
      return addPreamble(statement);
  }

  console.log("UNSEEN STATEMENT TYPE:", statement.type);
  return addPreamble(statement);
}

function rewriteVariableDeclaration(
  statement: types.VariableDeclaration
): Preambleable<types.VariableDeclaration> {
  let declarations: types.Statement[] = [];
  for (let declarator of statement.declarations) {
    let init = declarator.init;
    if (init) {
      init = rewriteAndConcat(init, declarations);
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

function rewriteStatementArrayAsStatementArray(statements: types.Statement[]) {
  let statements_: types.Statement[] = [];
  for (let statement of statements) {
    let { preamble, value: statement_ } = rewriteStatement(statement);

    statements_ = statements_.concat(preamble);

    if (statement_) {
      statements_.push(statement_);
    }
  }

  return statements_;
}

function rewriteScopedStatementBlock(statements: types.Statement[]) {
  statements = hoist(statements);
  statements = rewriteStatementArrayAsStatementArray(statements);

  return statements;
}

export default function rewriteProgram(program: types.Program): types.Program {
  return {
    ...program,
    body: rewriteScopedStatementBlock(program.body),
  };
}

let inputCode = fs.readFileSync("in.js", { encoding: "utf8" });

let { program } = parser.parse(inputCode);
let { code } = generate(rewriteProgram(program));

fs.writeFileSync("out.js", code, { encoding: "utf8" });
