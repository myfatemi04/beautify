import * as parser from "@babel/parser";
import generate from "@babel/generator";
import * as types from "@babel/types";
import BASE_NODE from "./base_node";

interface ExpressionWithPreamble {
  preamble: types.Statement[];
  expression: types.Expression;
}

interface StatementWithPreamble {
  preamble: types.Statement[];
  statement: types.Statement;
}

type WithPreamble = StatementWithPreamble | ExpressionWithPreamble;

function fromVarToLet(
  statement: types.VariableDeclaration
): types.VariableDeclaration {
  return {
    ...BASE_NODE,
    type: "VariableDeclaration",
    kind: "let",
    declarations: statement.declarations,
    declare: false,
  };
}

function hoist(statements: types.Statement[]): types.Statement[] {
  let variableDeclarations: types.VariableDeclaration[] = [];
  let functionDeclarations: types.FunctionDeclaration[] = [];
  let notHoisted: types.Statement[] = [];

  for (let statement of statements) {
    if (statement.type === "VariableDeclaration" && statement.kind === "var") {
      // Convert "var" to "let"
      variableDeclarations.push(fromVarToLet(statement));
    } else if (statement.type === "FunctionDeclaration") {
      functionDeclarations.push(statement);
    } else {
      notHoisted.push(statement);
    }
  }

  return [].concat(variableDeclarations, functionDeclarations, notHoisted);
}

function rewriteNegatedUnaryNumericLiteral(
  literal: types.NumericLiteral
): types.BooleanLiteral {
  if (literal.value === 0) {
    return {
      ...BASE_NODE,
      type: "BooleanLiteral",
      value: true,
    };
  } else {
    return {
      ...BASE_NODE,
      type: "BooleanLiteral",
      value: false,
    };
  }
}

function negateExpression(expression: types.Expression): types.Expression {
  switch (expression.type) {
    case "LogicalExpression":
      if (expression.operator === "&&") {
        return {
          ...BASE_NODE,
          type: "LogicalExpression",
          operator: "||",
          left: negateExpression(expression.left),
          right: negateExpression(expression.right),
        };
      } else if (expression.operator === "||") {
        return {
          ...BASE_NODE,
          type: "LogicalExpression",
          operator: "&&",
          left: negateExpression(expression.left),
          right: negateExpression(expression.right),
        };
      }
    case "UnaryExpression":
      if (expression.operator === "!") {
        // If a negated expression, un-negate the expression
        return expression.argument;
      }
  }

  // Return a regular negated expression
  return {
    ...BASE_NODE,
    type: "UnaryExpression",
    operator: "!",
    prefix: false,
    argument: expression,
  };
}

function rewriteConditionalExpressionStatement(
  expression: types.ConditionalExpression
): StatementWithPreamble {
  return createIfStatement(
    expression.test,
    toExpressionStatement(expression.consequent),
    toExpressionStatement(expression.alternate)
  );
}

function rewriteAndReduce(
  ...expressions: types.Expression[]
): [preamble: types.Statement[], members: types.Expression[]] {
  let preamble = [];
  let members = [];
  for (let expression of expressions) {
    let rewritten = rewriteExpression(expression);
    preamble = preamble.concat(rewritten.preamble);
    members.push(rewritten.expression);
  }

  return [preamble, members];
}

function createBinaryExpression(
  operator:
    | "+"
    | "-"
    | "/"
    | "%"
    | "*"
    | "**"
    | "&"
    | "|"
    | ">>"
    | ">>>"
    | "<<"
    | "^"
    | "=="
    | "==="
    | "!="
    | "!=="
    | "in"
    | "instanceof"
    | ">"
    | "<"
    | ">="
    | "<=",
  left: types.Expression,
  right: types.Expression
): types.BinaryExpression {
  return {
    ...BASE_NODE,
    type: "BinaryExpression",
    operator,
    left,
    right,
  };
}

function addPreambleToExpression(
  expression: types.Expression
): ExpressionWithPreamble {
  return {
    preamble: [],
    expression,
  };
}

function addPreambleToStatement(
  statement: types.Statement
): StatementWithPreamble {
  return {
    preamble: [],
    statement,
  };
}

function rewriteNegatedUnaryExpressionArgument(
  argument: types.Expression
): ExpressionWithPreamble {
  if (argument.type === "NumericLiteral") {
    // Convert !0 to true, and !1 to false.
    return addPreambleToExpression(rewriteNegatedUnaryNumericLiteral(argument));
  } else if (argument.type === "CallExpression") {
    // Remove "!" before (function(){})()
    return rewriteExpression(argument);
  } else {
    let { preamble, expression } = rewriteExpression(argument);
    return {
      preamble,
      expression: {
        ...BASE_NODE,
        type: "UnaryExpression",
        operator: "!",
        prefix: false,
        argument: expression,
      },
    };
  }
}

function rewriteUnaryExpression(
  expression: types.UnaryExpression
): ExpressionWithPreamble {
  if (expression.operator === "!") {
    return rewriteNegatedUnaryExpressionArgument(expression.argument);
  } else if (expression.operator === "void") {
    if (expression.argument.type === "NumericLiteral") {
      if (expression.argument.value === 0) {
        return addPreambleToExpression(createUndefined());
      }
    }
  }

  return addPreambleToExpression(expression);
}

function rewriteCallExpression(
  expression: types.CallExpression
): ExpressionWithPreamble {
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
      let rewritten = rewriteExpression(arg);
      preamble = preamble.concat(rewritten.preamble);
      args.push(rewritten.expression);
    }
  }

  let calleeExpression = expression.callee;
  if (expression.callee.type !== "V8IntrinsicIdentifier") {
    let rewrittenCallee = rewriteExpression(expression.callee);
    preamble = preamble.concat(rewrittenCallee.preamble);
    calleeExpression = rewrittenCallee.expression;
  }

  return {
    preamble,
    expression: {
      ...BASE_NODE,
      ...expression,
      callee: calleeExpression,
      type: "CallExpression",
      arguments: args,
    },
  };
}

function rewriteAssignmentExpression(
  expression: types.AssignmentExpression
): ExpressionWithPreamble {
  let [preamble, [right]] = rewriteAndReduce(expression.right);

  return {
    preamble,
    expression: {
      // Assignment expression
      ...expression,
      // Only rewrite the right side
      right: right,
    },
  };
}

function rewriteObjectExpression(
  expression: types.ObjectExpression
): ExpressionWithPreamble {
  let preamble = [];
  let properties = [];
  for (let property of expression.properties) {
    if (property.type === "SpreadElement") {
      properties.push(property);
    } else if (property.type === "ObjectMethod") {
      properties.push(property);
    } else if (property.type === "ObjectProperty") {
      let rewrittenKey = rewriteExpression(property.key);
      let key = rewrittenKey.expression;
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
        let rewrittenValue = rewriteExpression(value);
        preamble = preamble.concat(rewrittenValue.preamble);
        value = rewrittenValue.expression;
      }

      properties.push({
        type: "ObjectProperty",
        key,
        value,
      });
    }
  }

  return {
    preamble,
    expression: {
      ...BASE_NODE,
      type: "ObjectExpression",
      properties,
    },
  };
}

function rewriteFunctionExpression(
  expression: types.FunctionExpression
): ExpressionWithPreamble {
  let newBody = wrapWithBlock({
    preamble: rewriteScopedStatementBlock(expression.body.body),
    statement: undefined,
  });
  return {
    preamble: [],
    // just add the new body
    expression: {
      ...expression,
      body: newBody,
    },
  };
}

function rewriteArrayExpression(
  expression: types.ArrayExpression
): ExpressionWithPreamble {
  let preamble = [];
  let newElements = [];
  for (let element of expression.elements) {
    if (element.type === "SpreadElement") {
      newElements.push(element);
    } else {
      let rewritten = rewriteExpression(element);
      preamble = preamble.concat(rewritten.preamble);
      newElements.push(rewritten.expression);
    }
  }

  return {
    preamble,
    expression: {
      ...expression,
      elements: newElements,
    },
  };
}

function rewriteConditionalExpression(
  expression: types.ConditionalExpression
): ExpressionWithPreamble {
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
    expression: {
      ...BASE_NODE,
      type: "ConditionalExpression",
      test: testRewritten.expression,
      consequent: consequentRewritten.expression,
      alternate: alternateRewritten.expression,
    },
  };
}

/**
 * When given an expression using ==, ===, !==, !=, >, <, >=, <=, etc,
 * rewrite both sides of the expression (it's safe, both sides get calculated.)
 * @param expression Binary expression to rewrite
 */
function rewriteBinaryExpression(
  expression: types.BinaryExpression
): ExpressionWithPreamble {
  let preamble = [];
  let { left, right } = expression;

  if (left.type !== "PrivateName") {
    let leftRewritten = rewriteExpression(left);
    preamble = preamble.concat(leftRewritten.preamble);
    left = leftRewritten.expression;
  }

  let rightRewritten = rewriteExpression(right);
  preamble = preamble.concat(rightRewritten.preamble);
  right = rightRewritten.expression;

  return {
    preamble,
    expression: {
      ...BASE_NODE,
      type: "BinaryExpression",
      left,
      right,
      operator: expression.operator,
    },
  };
}

/**
 * When given an expression like A.B, rewrite the base member.
 * @param expression Member expression to rewrite
 */
function rewriteMemberExpression(
  expression: types.MemberExpression
): ExpressionWithPreamble {
  let preamble = [];
  let rewrittenObject = rewriteExpression(expression.object);
  let object = rewrittenObject.expression;
  preamble = preamble.concat(rewrittenObject.preamble);
  let property = expression.property;
  if (expression.property.type !== "PrivateName") {
    let rewrittenProperty = rewriteExpression(expression.property);
    preamble = preamble.concat(rewrittenProperty.preamble);
    property = rewrittenProperty.expression;
  }

  return {
    preamble,
    expression: {
      ...BASE_NODE,
      type: "MemberExpression",
      object,
      property,
      computed: expression.computed,
      optional: expression.optional,
    },
  };
}

/**
 * When given an expression like A + B or A * B, rewrite both members.
 * @param expression Arithmetic expression to rewrite
 */
function rewriteNewExpression(
  expression: types.NewExpression
): ExpressionWithPreamble {
  let callee = expression.callee;
  let preamble = [];
  if (callee.type !== "V8IntrinsicIdentifier") {
    let rewrittenCallee = rewriteExpression(callee);
    preamble = rewrittenCallee.preamble;
    callee = rewrittenCallee.expression;
  }

  return {
    preamble,
    expression: {
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
  return {
    ...expression,
    body: rewriteClassBody(expression.body),
  };
}

function rewriteClassDeclaration(
  expression: types.ClassDeclaration
): types.ClassDeclaration {
  return {
    ...expression,
    body: rewriteClassBody(expression.body),
  };
}

function rewriteArrowFunctionExpression(
  expression: types.ArrowFunctionExpression
): types.ArrowFunctionExpression {
  let newBody: types.BlockStatement | types.Expression;
  if (expression.body.type === "BlockStatement") {
    newBody = rewriteBlockStatement(expression.body);
  } else {
    newBody = rewriteExpression(expression.body).expression;
  }

  return {
    ...expression,
    body: newBody,
  };
}

function rewriteLogicalExpression(
  expression: types.LogicalExpression
): ExpressionWithPreamble {
  let [preamble, [left, right]] = rewriteAndReduce(
    expression.left,
    expression.right
  );
  return {
    preamble,
    expression: {
      ...expression,
      left,
      right,
    },
  };
}

function rewriteExpression(
  expression: types.Expression
): ExpressionWithPreamble {
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
    case "NewExpression":
      return rewriteNewExpression(expression);
    case "LogicalExpression":
      return rewriteLogicalExpression(expression);
    case "ClassExpression":
      return addPreambleToExpression(rewriteClassExpression(expression));
    case "ArrowFunctionExpression":
      return addPreambleToExpression(
        rewriteArrowFunctionExpression(expression)
      );
    case "Identifier":
    case "StringLiteral":
    case "DecimalLiteral":
    case "BigIntLiteral":
    case "NumericLiteral":
    case "BooleanLiteral":
    case "NullLiteral":
    case "ThisExpression":
    case "RecordExpression":
    case "RegExpLiteral":
    case "UpdateExpression": // i++, i--, --i, ++i
    case "Super":
      return addPreambleToExpression(expression);
  }

  console.log("Unseen expression type:", expression.type);

  return addPreambleToExpression(expression);
}

function rewriteLogicalExpressionAsIfStatement(
  expression: types.LogicalExpression
): StatementWithPreamble {
  if (expression.operator == "&&") {
    return createIfStatement(
      expression.left,
      toExpressionStatement(expression.right),
      undefined
    );
  } else if (expression.operator === "||") {
    return createIfStatement(
      negateExpression(expression.left),
      toExpressionStatement(expression.right),
      undefined
    );
    // TODO: Come back to this
  } else if (expression.operator === "??") {
    return createIfStatement(
      createBinaryExpression("!=", expression.left, createNull()),
      toExpressionStatement(expression.right),
      undefined
    );
  }
}

function createIfStatement(
  test: types.Expression,
  consequent: types.Statement,
  alternate: types.Statement
) {
  return rewriteIfStatement({
    ...BASE_NODE,
    type: "IfStatement",
    test,
    consequent,
    alternate,
  });
}

function toExpressionStatement(
  expression: types.Expression
): types.ExpressionStatement {
  return {
    ...BASE_NODE,
    type: "ExpressionStatement",
    expression,
  };
}

function rewriteSequenceExpression(
  sequence: types.SequenceExpression
): ExpressionWithPreamble {
  let expressions = sequence.expressions;
  if (expressions.length === 1) {
    return rewriteExpression(expressions[0]);
  } else {
    let preambleExpressions = expressions.slice(0, expressions.length - 1);
    let preambleStatements: types.ExpressionStatement[] = preambleExpressions.map(
      toExpressionStatement
    );
    let preamble: types.Statement[] = [];
    for (let statement of preambleStatements) {
      let {
        preamble: preamble_,
        statement: statement_,
      } = rewriteExpressionStatement(statement);

      preamble = preamble.concat(preamble_);
      preamble.push(statement_);
    }

    let expression = expressions[expressions.length - 1];
    let rewrittenExpression = rewriteExpression(expression);
    preamble = preamble.concat(rewrittenExpression.preamble);
    expression = rewrittenExpression.expression;

    return {
      preamble,
      expression,
    };
  }
}

function rewriteExpressionStatement(
  statement: types.ExpressionStatement
): StatementWithPreamble {
  let expression = statement.expression;
  switch (expression.type) {
    case "ConditionalExpression":
      return rewriteConditionalExpressionStatement(expression);
    case "LogicalExpression":
      return rewriteLogicalExpressionAsIfStatement(expression);
    default:
      let { preamble, expression: expression_ } = rewriteExpression(expression);
      return {
        preamble,
        statement: toExpressionStatement(expression_),
      };
  }
}

function wrapWithBlock(statement: StatementWithPreamble): types.BlockStatement {
  if (statement.preamble.length > 0) {
    return {
      ...BASE_NODE,
      type: "BlockStatement",
      directives: [],
      body: [...statement.preamble, statement.statement],
    };
  } else {
    if (!statement.statement) {
      return {
        ...BASE_NODE,
        type: "BlockStatement",
        directives: [],
        body: [],
      };
    } else {
      // prevent wrapping BlockStatements in BlockStatements
      if (statement.statement.type === "BlockStatement") {
        return statement.statement;
      } else {
        return {
          ...BASE_NODE,
          type: "BlockStatement",
          directives: [],
          body: [statement.statement],
        };
      }
    }
  }
}

function rewriteForStatement(
  statement: types.ForStatement
): StatementWithPreamble {
  let preamble = [];
  let initExpr = undefined;
  let testExpr = statement.test;

  if (statement.init) {
    if (statement.init.type === "VariableDeclaration") {
      let { preamble } = rewriteVariableDeclaration(statement.init);
      if (preamble.length > 0) {
        initExpr = preamble[preamble.length - 1];
        preamble = preamble.concat(preamble.slice(0, preamble.length - 1));
      }
    } else {
      let rewritten = rewriteExpression(statement.init);
      preamble = preamble.concat(rewritten.preamble);
      initExpr = rewritten.expression;
    }
  }

  if (statement.test) {
    let rewritten = rewriteExpression(statement.test);
    preamble = preamble.concat(rewritten.preamble);
    testExpr = rewritten.expression;
  }

  return {
    preamble,
    statement: {
      ...BASE_NODE,
      type: "ForStatement",
      init: initExpr,
      test: testExpr,
      update: statement.update,
      body: wrapWithBlock(rewriteStatement(statement.body)),
    },
  };
}

function rewriteIfStatement(
  statement: types.IfStatement
): StatementWithPreamble {
  let test = statement.test;
  let preamble = [];

  let rewrittenTest = rewriteExpression(test);
  preamble = preamble.concat(rewrittenTest.preamble);
  test = rewrittenTest.expression;

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
    statement: {
      ...BASE_NODE,
      type: "IfStatement",
      test,
      consequent,
      alternate,
    },
  };
}

function rewriteBlockStatement(
  statement: types.BlockStatement
): types.BlockStatement {
  return {
    ...BASE_NODE,
    directives: [],
    type: "BlockStatement",
    body: rewriteStatementArrayAsStatementArray(statement.body),
  };
}

function rewriteReturnStatement(
  statement: types.ReturnStatement
): StatementWithPreamble {
  if (!statement.argument) {
    return {
      preamble: [],
      statement,
    };
  } else {
    if (statement.argument.type === "ConditionalExpression") {
      let { test, consequent, alternate } = statement.argument;

      let returnsConsequent: types.ReturnStatement = {
        ...BASE_NODE,
        type: "ReturnStatement",
        argument: consequent,
      };

      let returnsAlternate: types.ReturnStatement = {
        ...BASE_NODE,
        type: "ReturnStatement",
        argument: alternate,
      };

      return rewriteIfStatement({
        ...BASE_NODE,
        type: "IfStatement",
        test,
        consequent: returnsConsequent,
        alternate: returnsAlternate,
      });
    }

    let { preamble, expression } = rewriteExpression(statement.argument);
    return {
      preamble,
      statement: {
        ...BASE_NODE,
        type: "ReturnStatement",
        argument: expression,
      },
    };
  }
}

function rewriteFunctionDeclaration(
  statement: types.FunctionDeclaration
): StatementWithPreamble {
  return {
    preamble: [],
    statement: {
      ...statement,
      body: wrapWithBlock({
        preamble: rewriteScopedStatementBlock(statement.body.body),
        statement: undefined,
      }),
    },
  };
}

function rewriteSwitchCase(case_: types.SwitchCase): types.SwitchCase {
  // preambles are NOT allowed
  // if test = undefined, it's a "default" case
  let test = case_.test ? rewriteExpression(case_.test).expression : undefined;
  let consequent = rewriteStatementArrayAsStatementArray(case_.consequent);

  return {
    ...BASE_NODE,
    type: "SwitchCase",
    test,
    consequent,
  };
}

function rewriteSwitchStatement(
  statement: types.SwitchStatement
): StatementWithPreamble {
  let [preamble, [discriminant]] = rewriteAndReduce(statement.discriminant);
  let cases = statement.cases.map((case_) => rewriteSwitchCase(case_));
  return {
    preamble,
    statement: {
      ...BASE_NODE,
      type: "SwitchStatement",
      discriminant,
      cases,
    },
  };
}

function rewriteCatchClause(clause: types.CatchClause): types.CatchClause {
  return {
    ...clause,
    body: rewriteBlockStatement(clause.body),
  };
}

function rewriteTryStatement(
  statement: types.TryStatement
): types.TryStatement {
  let block = rewriteBlockStatement(statement.block);
  let handler = rewriteCatchClause(statement.handler);
  let finalizer = statement.finalizer
    ? rewriteBlockStatement(statement.finalizer)
    : undefined;
  return {
    ...BASE_NODE,
    type: "TryStatement",
    block,
    handler,
    finalizer,
  };
}

function rewriteThrowStatement(
  statement: types.ThrowStatement
): StatementWithPreamble {
  let [preamble, [argument]] = rewriteAndReduce(statement.argument);
  return {
    preamble,
    statement: {
      ...statement,
      argument,
    },
  };
}

function rewriteForOfInStatement(
  statement: types.ForOfStatement | types.ForInStatement
): StatementWithPreamble {
  let body = wrapWithBlock(rewriteStatement(statement.body));
  let [preamble, [right]] = rewriteAndReduce(statement.right);

  return {
    preamble,
    statement: {
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
  let testRewritten = rewriteExpression(statement.test);

  // If there's something in the test, add it to the end of the loop
  if (testRewritten.preamble) {
    body.body = body.body.concat(testRewritten.preamble);
  }

  let test = testRewritten.expression;
  return {
		...BASE_NODE,
		type: "DoWhileStatement",
		body,
		test
	};
}

function rewriteStatement(statement: types.Statement): StatementWithPreamble {
  switch (statement.type) {
    case "ExpressionStatement":
      return rewriteExpressionStatement(statement);
    case "ForStatement":
      return rewriteForStatement(statement);
    case "BlockStatement":
      return addPreambleToStatement(rewriteBlockStatement(statement));
    case "IfStatement":
      return rewriteIfStatement(statement);
    case "FunctionDeclaration":
      return rewriteFunctionDeclaration(statement);
    case "ReturnStatement":
      return rewriteReturnStatement(statement);
    case "VariableDeclaration":
      return rewriteVariableDeclaration(statement);
    case "ClassDeclaration":
      return addPreambleToStatement(rewriteClassDeclaration(statement));
    case "SwitchStatement":
      return rewriteSwitchStatement(statement);
    case "TryStatement":
      return addPreambleToStatement(rewriteTryStatement(statement));
    case "ThrowStatement":
      return rewriteThrowStatement(statement);
    case "ForInStatement":
    case "ForOfStatement":
			return rewriteForOfInStatement(statement);
		case "DoWhileStatement":
			return addPreambleToStatement(rewriteDoWhileStatement(statement));
    case "ContinueStatement":
    case "BreakStatement":
    case "EmptyStatement":
      return addPreambleToStatement(statement);
  }

  console.log("UNSEEN STATEMENT TYPE:", statement.type);
  return addPreambleToStatement(statement);
}

function rewriteVariableDeclaration(
  statement: types.VariableDeclaration
): StatementWithPreamble {
  let declarations: types.Statement[] = [];
  for (let declarator of statement.declarations) {
    let newInit = declarator.init;
    if (newInit) {
      let { preamble, expression } = rewriteExpression(newInit);
      declarations = declarations.concat(preamble);
      newInit = expression;
    }

    declarations.push({
      ...BASE_NODE,
      type: "VariableDeclaration",
      kind: statement.kind,
      declare: false,
      declarations: [
        {
          ...BASE_NODE,
          type: "VariableDeclarator",
          id: declarator.id,
          init: newInit,
          definite: false,
        },
      ],
    });
  }

  return {
    preamble: declarations,
    statement: undefined,
  };
}

function rewriteStatementArrayAsStatementArray(statements: types.Statement[]) {
  let statements_: types.Statement[] = [];
  for (let statement of statements) {
    let { preamble, statement: statement_ } = rewriteStatement(statement);

    statements_ = statements_.concat(preamble);
    statements_.push(statement_);
  }

  return statements_;
}

function rewriteScopedStatementBlock(statements: types.Statement[]) {
  statements = hoist(statements);
  // statements = splitVariableDeclarations(statements);
  statements = rewriteStatementArrayAsStatementArray(statements);

  return statements;
}

export default function rewriteProgram(program: types.Program): types.Program {
  return {
    ...program,
    body: rewriteScopedStatementBlock(program.body),
  };
}

import * as fs from "fs";
import { createUndefined, createNull } from "./create";

let inputCode = fs.readFileSync("in.js", { encoding: "utf8" });

let { program } = parser.parse(inputCode);

let refactored = rewriteProgram(program);

let { code } = generate(refactored);

fs.writeFileSync("out.js", code, { encoding: "utf8" });
