"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
var parser = require("@babel/parser");
var generator_1 = require("@babel/generator");
var types = require("@babel/types");
var fs = require("fs");
var hoist_1 = require("./hoist");
function rewriteNegatedUnaryNumericLiteral(literal) {
    return types.booleanLiteral(literal.value === 0);
}
function negateExpression(expression) {
    switch (expression.type) {
        case "LogicalExpression":
            if (expression.operator === "&&") {
                return types.logicalExpression("||", negateExpression(expression.left), negateExpression(expression.right));
            }
            else if (expression.operator === "||") {
                return types.logicalExpression("&&", negateExpression(expression.left), negateExpression(expression.right));
            }
        case "UnaryExpression":
            if (expression.operator === "!") {
                // If a negated expression, un-negate the expression
                return expression.argument;
            }
    }
    // Return a regular negated expression
    return types.unaryExpression("!", expression);
}
function rewriteConditionalExpressionStatement(expression) {
    return createIfStatement(expression.test, types.expressionStatement(expression.consequent), types.expressionStatement(expression.alternate));
}
function rewriteAndReduce() {
    var expressions = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        expressions[_i] = arguments[_i];
    }
    var preamble = [];
    var members = [];
    for (var _a = 0, expressions_1 = expressions; _a < expressions_1.length; _a++) {
        var expression = expressions_1[_a];
        var rewritten = rewriteExpression(expression);
        preamble = preamble.concat(rewritten.preamble);
        members.push(rewritten.value);
    }
    return [preamble, members];
}
function addPreamble(value) {
    return {
        preamble: [],
        value: value
    };
}
function rewriteNegatedUnaryExpressionArgument(argument) {
    if (argument.type === "NumericLiteral") {
        // Convert !0 to true, and !1 to false.
        return addPreamble(rewriteNegatedUnaryNumericLiteral(argument));
    }
    else if (argument.type === "CallExpression") {
        // Remove "!" before (function(){})()
        return rewriteExpression(argument);
    }
    else {
        var _a = rewriteExpression(argument), preamble = _a.preamble, value = _a.value;
        return {
            preamble: preamble,
            value: types.unaryExpression("!", value)
        };
    }
}
function rewriteUnaryExpression(expression) {
    if (expression.operator === "!") {
        return rewriteNegatedUnaryExpressionArgument(expression.argument);
    }
    else if (expression.operator === "void") {
        if (expression.argument.type === "NumericLiteral") {
            if (expression.argument.value === 0) {
                return addPreamble(types.identifier("undefined"));
            }
        }
    }
    return addPreamble(expression);
}
function rewriteCallExpression(expression) {
    var preamble = [];
    var args = [];
    for (var _i = 0, _a = expression.arguments; _i < _a.length; _i++) {
        var arg = _a[_i];
        if (arg.type === "SpreadElement" ||
            arg.type === "JSXNamespacedName" ||
            arg.type === "ArgumentPlaceholder") {
            args.push(arg);
        }
        else {
            args.push(rewriteAndConcat(arg, preamble));
        }
    }
    var calleeExpression = expression.callee;
    if (expression.callee.type !== "V8IntrinsicIdentifier") {
        var rewrittenCallee = rewriteExpression(expression.callee);
        preamble = preamble.concat(rewrittenCallee.preamble);
        calleeExpression = rewrittenCallee.value;
    }
    return {
        preamble: preamble,
        value: types.callExpression(calleeExpression, args)
    };
}
function rewriteAssignmentExpression(expression) {
    var _a = rewriteAndReduce(expression.right), preamble = _a[0], right = _a[1][0];
    return {
        preamble: preamble,
        value: __assign(__assign({}, expression), { 
            // Only rewrite the right side
            right: right })
    };
}
function rewriteObjectExpression(expression) {
    var preamble = [];
    var properties = [];
    for (var _i = 0, _a = expression.properties; _i < _a.length; _i++) {
        var property = _a[_i];
        if (property.type === "SpreadElement") {
            properties.push(property);
        }
        else if (property.type === "ObjectMethod") {
            properties.push(property);
        }
        else if (property.type === "ObjectProperty") {
            var rewrittenKey = rewriteExpression(property.key);
            var key = rewrittenKey.value;
            var value = property.value;
            preamble = preamble.concat(rewrittenKey.preamble);
            if ([
                "Identifier",
                "RestElement",
                "AssignmentPattern",
                "ArrayPattern",
                "ObjectPattern",
            ].includes(value.type)) {
            }
            else {
                // @ts-ignore
                value = rewriteAndConcat(value, preamble);
            }
            properties.push(__assign(__assign({ type: "ObjectProperty" }, property), { key: key,
                value: value }));
        }
    }
    return {
        preamble: preamble,
        value: types.objectExpression(properties)
    };
}
function rewriteFunctionExpression(expression) {
    return {
        preamble: [],
        // just add the new body
        value: __assign(__assign({}, expression), { body: wrapWithBlock({
                preamble: rewriteScopedStatementBlock(expression.body.body),
                value: undefined
            }) })
    };
}
function rewriteArrayExpression(expression) {
    var preamble = [];
    var newElements = [];
    for (var _i = 0, _a = expression.elements; _i < _a.length; _i++) {
        var element = _a[_i];
        if (element.type === "SpreadElement") {
            newElements.push(element);
        }
        else {
            newElements.push(rewriteAndConcat(element, preamble));
        }
    }
    return {
        preamble: preamble,
        value: __assign(__assign({}, expression), { elements: newElements })
    };
}
function rewriteConditionalExpression(expression) {
    var test = expression.test, consequent = expression.consequent, alternate = expression.alternate;
    var testRewritten = rewriteExpression(test);
    var consequentRewritten = rewriteExpression(consequent);
    var alternateRewritten = rewriteExpression(alternate);
    var preamble = [].concat(testRewritten.preamble, consequentRewritten.preamble, alternateRewritten.preamble);
    return {
        preamble: preamble,
        value: types.conditionalExpression(testRewritten.value, consequentRewritten.value, alternateRewritten.value)
    };
}
/**
 * When given an expression using ==, ===, !==, !=, >, <, >=, <=, etc,
 * rewrite both sides of the expression (it's safe, both sides get calculated.)
 * @param expression Binary expression to rewrite
 */
function rewriteBinaryExpression(expression) {
    var preamble = [];
    var left = expression.left, right = expression.right, operator = expression.operator;
    if (left.type !== "PrivateName") {
        var leftRewritten = rewriteExpression(left);
        preamble = preamble.concat(leftRewritten.preamble);
        left = leftRewritten.value;
    }
    var rightRewritten = rewriteExpression(right);
    preamble = preamble.concat(rightRewritten.preamble);
    right = rightRewritten.value;
    return {
        preamble: preamble,
        value: types.binaryExpression(operator, left, right)
    };
}
/**
 * When given an expression like A.B, rewrite the base member.
 * @param expression Member expression to rewrite
 */
function rewriteMemberExpression(expression) {
    var preamble = [];
    var object = rewriteAndConcat(expression.object, preamble);
    var property = expression.property;
    if (expression.property.type !== "PrivateName") {
        property = rewriteAndConcat(expression.property, preamble);
    }
    return {
        preamble: preamble,
        value: types.memberExpression(object, property, expression.computed, expression.optional)
    };
}
/**
 * When given an expression like A + B or A * B, rewrite both members.
 * @param expression Arithmetic expression to rewrite
 */
function rewriteNewExpression(expression) {
    var callee = expression.callee;
    var preamble = [];
    if (callee.type !== "V8IntrinsicIdentifier") {
        var rewrittenCallee = rewriteExpression(callee);
        preamble = rewrittenCallee.preamble;
        callee = rewrittenCallee.value;
    }
    return {
        preamble: preamble,
        value: __assign(__assign({}, expression), { callee: callee })
    };
}
function rewriteClassMethod(expression) {
    return __assign(__assign({}, expression), { body: rewriteBlockStatement(expression.body) });
}
function rewriteClassProperty(expression) {
    var _a = rewriteAndReduce(expression.value), preamble = _a[0], value = _a[1][0];
    return __assign(__assign({}, expression), { value: value });
}
function rewriteClassBody(expression_) {
    var body = [];
    for (var _i = 0, _a = expression_.body; _i < _a.length; _i++) {
        var expression = _a[_i];
        if (expression.type === "ClassMethod" ||
            expression.type === "ClassPrivateMethod") {
            body.push(rewriteClassMethod(expression));
        }
        else if (expression.type === "ClassProperty" ||
            expression.type === "ClassPrivateProperty") {
            body.push(rewriteClassProperty(expression));
        }
        else {
            body.push(expression);
        }
    }
    return __assign(__assign({}, expression_), { body: body });
}
function rewriteClassExpression(expression) {
    return __assign(__assign({}, expression), { body: rewriteClassBody(expression.body) });
}
function rewriteClassDeclaration(expression) {
    return __assign(__assign({}, expression), { body: rewriteClassBody(expression.body) });
}
function rewriteArrowFunctionExpression(expression) {
    var newBody;
    if (expression.body.type === "BlockStatement") {
        newBody = rewriteBlockStatement(expression.body);
    }
    else {
        newBody = rewriteExpression(expression.body).value;
    }
    return __assign(__assign({}, expression), { body: newBody });
}
function rewriteLogicalExpression(expression) {
    var _a = rewriteAndReduce(expression.left, expression.right), preamble = _a[0], _b = _a[1], left = _b[0], right = _b[1];
    return {
        preamble: preamble,
        value: __assign(__assign({}, expression), { left: left,
            right: right })
    };
}
function rewriteExpression(expression) {
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
            return addPreamble(rewriteClassExpression(expression));
        case "ArrowFunctionExpression":
            return addPreamble(rewriteArrowFunctionExpression(expression));
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
            return addPreamble(expression);
    }
    console.log("Unseen expression type:", expression.type);
    return addPreamble(expression);
}
function rewriteLogicalExpressionAsIfStatement(expression) {
    if (expression.operator == "&&") {
        return createIfStatement(expression.left, types.expressionStatement(expression.right), undefined);
    }
    else if (expression.operator === "||") {
        return createIfStatement(negateExpression(expression.left), types.expressionStatement(expression.right), undefined);
    }
    else if (expression.operator === "??") {
        return createIfStatement(types.binaryExpression("!=", expression.left, types.nullLiteral()), types.expressionStatement(expression.right), undefined);
    }
}
function createIfStatement(test, consequent, alternate) {
    return rewriteIfStatement(types.ifStatement(test, consequent, alternate));
}
function rewriteSequenceExpression(sequence) {
    var expressions = sequence.expressions;
    if (expressions.length === 1) {
        return rewriteExpression(expressions[0]);
    }
    else {
        var preambleExpressions = expressions.slice(0, expressions.length - 1);
        var preambleStatements = preambleExpressions.map(function (expression) { return types.expressionStatement(expression); });
        var preamble = [];
        for (var _i = 0, preambleStatements_1 = preambleStatements; _i < preambleStatements_1.length; _i++) {
            var statement = preambleStatements_1[_i];
            var _a = rewriteExpressionStatement(statement), preamble_ = _a.preamble, statement_ = _a.value;
            preamble = preamble.concat(preamble_);
            preamble.push(statement_);
        }
        var expression = expressions[expressions.length - 1];
        var rewrittenExpression = rewriteExpression(expression);
        preamble = preamble.concat(rewrittenExpression.preamble);
        expression = rewrittenExpression.value;
        return {
            preamble: preamble,
            value: expression
        };
    }
}
function rewriteExpressionStatement(statement) {
    var expression = statement.expression;
    switch (expression.type) {
        case "ConditionalExpression":
            return rewriteConditionalExpressionStatement(expression);
        case "LogicalExpression": {
            return rewriteLogicalExpressionAsIfStatement(expression);
        }
        default: {
            var _a = rewriteExpression(expression), preamble = _a.preamble, value = _a.value;
            return {
                preamble: preamble,
                value: types.expressionStatement(value)
            };
        }
    }
}
function wrapWithBlock(statement) {
    if (statement.preamble.length > 0) {
        return types.blockStatement(__spreadArrays(statement.preamble, [statement.value]));
    }
    else {
        if (!statement.value) {
            return types.blockStatement([]);
        }
        else if (statement.value.type === "BlockStatement") {
            // prevent wrapping BlockStatements in BlockStatements
            return statement.value;
        }
        else {
            return types.blockStatement([statement.value]);
        }
    }
}
function rewriteAndConcat(expression, preamble) {
    if (preamble === void 0) { preamble = []; }
    var _a = rewriteExpression(expression), pre = _a.preamble, value = _a.value;
    preamble.push.apply(preamble, pre);
    return value;
}
function rewriteForStatement(statement) {
    var preamble = [];
    var init = undefined;
    var test = statement.test;
    if (statement.init) {
        if (statement.init.type === "VariableDeclaration") {
            var preamble_ = rewriteVariableDeclaration(statement.init).preamble;
            if (preamble_.length > 0) {
                init = preamble_[preamble_.length - 1];
                preamble = preamble.concat(preamble_.slice(0, preamble_.length - 1));
            }
        }
        else {
            init = rewriteAndConcat(statement.init, preamble);
        }
    }
    if (statement.test) {
        test = rewriteAndConcat(statement.test, preamble);
    }
    return {
        preamble: preamble,
        value: types.forStatement(init, test, statement.update, wrapWithBlock(rewriteStatement(statement.body)))
    };
}
function rewriteIfStatement(statement) {
    var test = statement.test;
    var preamble = [];
    test = rewriteAndConcat(test, preamble);
    var consequent = statement.consequent;
    var alternate = statement.alternate;
    if (consequent) {
        consequent = wrapWithBlock(rewriteStatement(consequent));
    }
    if (alternate) {
        alternate = wrapWithBlock(rewriteStatement(alternate));
    }
    return {
        preamble: preamble,
        value: types.ifStatement(test, consequent, alternate)
    };
}
function rewriteBlockStatement(statement) {
    return types.blockStatement(rewriteStatementArrayAsStatementArray(statement.body));
}
function rewriteReturnStatement(statement) {
    if (!statement.argument) {
        return addPreamble(statement);
    }
    else {
        if (statement.argument.type === "ConditionalExpression") {
            var _a = statement.argument, test = _a.test, consequent = _a.consequent, alternate = _a.alternate;
            return createIfStatement(test, types.returnStatement(consequent), types.returnStatement(alternate));
        }
        var _b = rewriteExpression(statement.argument), preamble = _b.preamble, value = _b.value;
        return {
            preamble: preamble,
            value: types.returnStatement(value)
        };
    }
}
function rewriteFunctionDeclaration(statement) {
    return {
        preamble: [],
        value: types.functionDeclaration(statement.id, statement.params, wrapWithBlock({
            preamble: rewriteScopedStatementBlock(statement.body.body),
            value: undefined
        }))
    };
}
function rewriteSwitchCase(case_) {
    // preambles are NOT allowed
    // if test = undefined, it's a "default" case
    var test = case_.test ? rewriteExpression(case_.test).value : undefined;
    var consequent = rewriteStatementArrayAsStatementArray(case_.consequent);
    return types.switchCase(test, consequent);
}
function rewriteSwitchStatement(statement) {
    var _a = rewriteAndReduce(statement.discriminant), preamble = _a[0], discriminant = _a[1][0];
    var cases = statement.cases.map(function (case_) { return rewriteSwitchCase(case_); });
    return {
        preamble: preamble,
        value: types.switchStatement(discriminant, cases)
    };
}
function rewriteCatchClause(clause) {
    return __assign(__assign({}, clause), { body: rewriteBlockStatement(clause.body) });
}
function rewriteLabeledStatement(statement) {
    return __assign(__assign({}, statement), { body: wrapWithBlock(rewriteStatement(statement.body)) });
}
function rewriteTryStatement(statement) {
    var block = rewriteBlockStatement(statement.block);
    var handler = statement.handler
        ? rewriteCatchClause(statement.handler)
        : undefined;
    var finalizer = statement.finalizer
        ? rewriteBlockStatement(statement.finalizer)
        : undefined;
    return types.tryStatement(block, handler, finalizer);
}
function rewriteThrowStatement(statement) {
    var _a = rewriteAndReduce(statement.argument), preamble = _a[0], argument = _a[1][0];
    return {
        preamble: preamble,
        value: types.throwStatement(argument)
    };
}
function rewriteForOfInStatement(statement) {
    var body = wrapWithBlock(rewriteStatement(statement.body));
    var _a = rewriteAndReduce(statement.right), preamble = _a[0], right = _a[1][0];
    return {
        preamble: preamble,
        value: __assign(__assign({}, statement), { body: body,
            right: right })
    };
}
function rewriteDoWhileStatement(statement) {
    var body = wrapWithBlock(rewriteStatement(statement.body));
    // If there's something in the test, add it to the end of the loop
    var test = rewriteAndConcat(statement.test, body.body);
    return types.doWhileStatement(test, body);
}
function rewriteWhileStatement(statement) {
    var body = wrapWithBlock(rewriteStatement(statement.body));
    var testRewritten = rewriteExpression(statement.test);
    var test = testRewritten.value;
    var preamble = [];
    // If there's a preamble in the test, add before the while loop
    // and at the end of the block
    if (testRewritten.preamble) {
        preamble = testRewritten.preamble;
        body.body = body.body.concat(testRewritten.preamble);
    }
    return {
        preamble: preamble,
        value: types.whileStatement(test, body)
    };
}
function rewriteStatement(statement) {
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
function rewriteVariableDeclaration(statement) {
    var declarations = [];
    for (var _i = 0, _a = statement.declarations; _i < _a.length; _i++) {
        var declarator = _a[_i];
        var init = declarator.init;
        if (init) {
            init = rewriteAndConcat(init, declarations);
        }
        declarations.push(types.variableDeclaration(statement.kind, [
            types.variableDeclarator(declarator.id, declarator.init),
        ]));
    }
    return {
        preamble: declarations,
        value: undefined
    };
}
function rewriteStatementArrayAsStatementArray(statements) {
    var statements_ = [];
    for (var _i = 0, statements_1 = statements; _i < statements_1.length; _i++) {
        var statement = statements_1[_i];
        var _a = rewriteStatement(statement), preamble = _a.preamble, statement_ = _a.value;
        statements_ = statements_.concat(preamble);
        statements_.push(statement_);
    }
    return statements_;
}
function rewriteScopedStatementBlock(statements) {
    statements = hoist_1["default"](statements);
    // statements = splitVariableDeclarations(statements);
    statements = rewriteStatementArrayAsStatementArray(statements);
    return statements;
}
function rewriteProgram(program) {
    return __assign(__assign({}, program), { body: rewriteScopedStatementBlock(program.body) });
}
exports["default"] = rewriteProgram;
var inputCode = fs.readFileSync("in.js", { encoding: "utf8" });
var program = parser.parse(inputCode).program;
// import * as uses from "./uses";
// console.log(uses.getIdentifiersStatementsUse(program.body));
var refactored = rewriteProgram(program);
var code = generator_1["default"](refactored).code;
fs.writeFileSync("out.js", code, { encoding: "utf8" });
