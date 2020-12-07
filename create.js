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
exports.__esModule = true;
exports.createUndefined = exports.createEmptyVariableDeclaration = exports.createVariableDeclarationFromDeclarator = exports.createIdentifier = exports.createNull = void 0;
var base_node_1 = require("./base_node");
function createNull() {
    return __assign(__assign({}, base_node_1["default"]), { type: "NullLiteral" });
}
exports.createNull = createNull;
function createIdentifier(name) {
    return __assign(__assign({}, base_node_1["default"]), { decorators: undefined, optional: undefined, typeAnnotation: undefined, type: "Identifier", name: name });
}
exports.createIdentifier = createIdentifier;
function createVariableDeclarationFromDeclarator(kind, declarator) {
    return __assign(__assign({}, base_node_1["default"]), { type: "VariableDeclaration", kind: kind, declare: false, declarations: [declarator] });
}
exports.createVariableDeclarationFromDeclarator = createVariableDeclarationFromDeclarator;
function createEmptyVariableDeclaration(kind, name, definite) {
    if (definite === void 0) { definite = false; }
    return createVariableDeclarationFromDeclarator(kind, __assign(__assign({}, base_node_1["default"]), { type: "VariableDeclarator", id: createIdentifier(name), init: undefined, definite: definite }));
}
exports.createEmptyVariableDeclaration = createEmptyVariableDeclaration;
function createUndefined() {
    return createIdentifier("undefined");
}
exports.createUndefined = createUndefined;
