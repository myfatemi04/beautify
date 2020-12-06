"use strict";
exports.__esModule = true;
exports.getInitialValuesStatementsUse = exports.getIdentifiersExpressionUses = exports.getIdentifiersObjectPropertyUses = exports.getIdentifiersExpressionsUse = void 0;
function getIdentifiersExpressionsUse(expressions) {
    var identifiers = expressions.map(function (element) {
        if (element.type !== "ArgumentPlaceholder") {
            return getIdentifiersExpressionUses(element);
        }
        else {
            return [];
        }
    });
    return combine.apply(void 0, identifiers);
}
exports.getIdentifiersExpressionsUse = getIdentifiersExpressionsUse;
function getIdentifiersObjectPropertyUses(property) {
    // "computed" is for things like { [a]: b }
    // if it's not computed, don't mistakenly call it an identifier
    if (!property.computed) {
        return getIdentifiersExpressionUses(property.value);
    }
    else {
        return combine(getIdentifiersExpressionUses(property.key), getIdentifiersExpressionUses(property.value));
    }
}
exports.getIdentifiersObjectPropertyUses = getIdentifiersObjectPropertyUses;
function combine() {
    var infos = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        infos[_i] = arguments[_i];
    }
    return [].concat.apply([], infos);
}
function getParentNodeOfMemberExpression(expression) {
    if (expression.type === "MemberExpression") {
        return getParentNodeOfMemberExpression(expression);
    }
    else {
        return expression;
    }
}
function getIdentifiersExpressionUses(expression) {
    switch (expression.type) {
        case "SpreadElement":
        case "UnaryExpression":
            return getIdentifiersExpressionUses(expression.argument);
        case "Identifier":
            return [{ type: "get", id: expression }];
        case "BinaryExpression":
        case "LogicalExpression":
            // left before right
            return combine(getIdentifiersExpressionUses(expression.left), getIdentifiersExpressionUses(expression.right));
        case "CallExpression":
            // callee before arguments
            return combine(getIdentifiersExpressionUses(expression.callee), getIdentifiersExpressionsUse(expression.arguments));
        case "ArrayExpression":
            return getIdentifiersExpressionsUse(expression.elements);
        case "ObjectExpression": {
            var identifiers = [];
            for (var _i = 0, _a = expression.properties; _i < _a.length; _i++) {
                var property = _a[_i];
                if (property.type === "SpreadElement") {
                    identifiers = combine(identifiers, getIdentifiersExpressionUses(property));
                }
                else if (property.type === "ObjectProperty") {
                    identifiers = combine(identifiers, getIdentifiersObjectPropertyUses(property));
                }
            }
            return identifiers;
        }
        case "AssignmentExpression": {
            var lhs = expression.left;
            var identifiers = [];
            if (lhs.type === "Identifier") {
                identifiers.push({ type: "set", id: lhs });
            }
            else if (lhs.type === "MemberExpression") {
                var object = getParentNodeOfMemberExpression(lhs.object);
                if (object.type === "Identifier") {
                    identifiers.push({ type: "get", id: object });
                }
            }
            return combine(identifiers, getIdentifiersExpressionUses(expression.right));
        }
        case "ArrayPattern":
            return combine.apply(void 0, expression.elements.map(function (element) {
                return getIdentifiersExpressionUses(element);
            }));
        case "ObjectPattern":
            return [];
        case "AssignmentPattern": {
            return combine(getIdentifiersExpressionUses(expression.left), getIdentifiersExpressionUses(expression.right));
        }
        case "MemberExpression": {
            return combine(getIdentifiersExpressionUses(expression.object), getIdentifiersExpressionUses(expression.property));
        }
        case "RestElement": {
            if (expression.argument.type === "TSParameterProperty") {
                return [];
            }
            else {
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
exports.getIdentifiersExpressionUses = getIdentifiersExpressionUses;
function getInitialValuesStatementsUse(statements) {
    var gone = {};
    var used = {};
    for (var _i = 0, statements_1 = statements; _i < statements_1.length; _i++) {
        var statement = statements_1[_i];
        switch (statement.type) {
            case "ExpressionStatement": {
                var uses = getIdentifiersExpressionUses(statement.expression);
                for (var _a = 0, uses_1 = uses; _a < uses_1.length; _a++) {
                    var access = uses_1[_a];
                    if (access.type === "get") {
                        if (!gone[access.id.name]) {
                            used[access.id.name] = true;
                        }
                    }
                    else if (access.type === "set") {
                        gone[access.id.name] = true;
                    }
                }
            }
        }
    }
    return {
        used: used,
        gone: gone
    };
}
exports.getInitialValuesStatementsUse = getInitialValuesStatementsUse;
