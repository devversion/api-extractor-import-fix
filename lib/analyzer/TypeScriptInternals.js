"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeScriptInternals = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
const ts = __importStar(require("typescript"));
const node_core_library_1 = require("@rushstack/node-core-library");
class TypeScriptInternals {
    static getImmediateAliasedSymbol(symbol, typeChecker) {
        // Compiler internal:
        // https://github.com/microsoft/TypeScript/blob/v3.2.2/src/compiler/checker.ts
        return typeChecker.getImmediateAliasedSymbol(symbol); // eslint-disable-line @typescript-eslint/no-explicit-any
    }
    /**
     * Returns the Symbol for the provided Declaration.  This is a workaround for a missing
     * feature of the TypeScript Compiler API.   It is the only apparent way to reach
     * certain data structures, and seems to always work, but is not officially documented.
     *
     * @returns The associated Symbol.  If there is no semantic information (e.g. if the
     * declaration is an extra semicolon somewhere), then "undefined" is returned.
     */
    static tryGetSymbolForDeclaration(declaration, checker) {
        let symbol = declaration.symbol;
        if (symbol && symbol.escapedName === ts.InternalSymbolName.Computed) {
            const name = ts.getNameOfDeclaration(declaration);
            symbol = (name && checker.getSymbolAtLocation(name)) || symbol;
        }
        return symbol;
    }
    /**
     * Returns whether the provided Symbol is a TypeScript "late-bound" Symbol (i.e. was created by the Checker
     * for a computed property based on its type, rather than by the Binder).
     */
    static isLateBoundSymbol(symbol) {
        if (
        // eslint-disable-next-line no-bitwise
        symbol.flags & ts.SymbolFlags.Transient &&
            symbol.checkFlags === ts.CheckFlags.Late) {
            return true;
        }
        return false;
    }
    /**
     * Retrieves the comment ranges associated with the specified node.
     */
    static getJSDocCommentRanges(node, text) {
        // Compiler internal:
        // https://github.com/microsoft/TypeScript/blob/v2.4.2/src/compiler/utilities.ts#L616
        return ts.getJSDocCommentRanges.apply(this, arguments);
    }
    /**
     * Retrieves the (unescaped) value of an string literal, numeric literal, or identifier.
     */
    static getTextOfIdentifierOrLiteral(node) {
        // Compiler internal:
        // https://github.com/microsoft/TypeScript/blob/v3.2.2/src/compiler/utilities.ts#L2721
        return ts.getTextOfIdentifierOrLiteral(node);
    }
    /**
     * Retrieves the (cached) module resolution information for a module name that was exported from a SourceFile.
     * The compiler populates this cache as part of analyzing the source file.
     */
    static getResolvedModule(sourceFile, moduleNameText) {
        // Compiler internal:
        // https://github.com/microsoft/TypeScript/blob/v3.2.2/src/compiler/utilities.ts#L218
        return ts.getResolvedModule(sourceFile, moduleNameText);
    }
    /**
     * Returns ts.Symbol.parent if it exists.
     */
    static getSymbolParent(symbol) {
        return symbol.parent;
    }
    /**
     * In an statement like `export default class X { }`, the `Symbol.name` will be `default`
     * whereas the `localSymbol` is `X`.
     */
    static tryGetLocalSymbol(declaration) {
        return declaration.localSymbol;
    }
    static getGlobalVariableAnalyzer(program) {
        const anyProgram = program;
        if (!anyProgram.getDiagnosticsProducingTypeChecker) {
            throw new node_core_library_1.InternalError('Missing Program.getDiagnosticsProducingTypeChecker');
        }
        const typeChecker = anyProgram.getDiagnosticsProducingTypeChecker();
        if (!typeChecker.getEmitResolver) {
            throw new node_core_library_1.InternalError('Missing TypeChecker.getEmitResolver');
        }
        const resolver = typeChecker.getEmitResolver();
        if (!resolver.hasGlobalName) {
            throw new node_core_library_1.InternalError('Missing EmitResolver.hasGlobalName');
        }
        return resolver;
    }
}
exports.TypeScriptInternals = TypeScriptInternals;
//# sourceMappingURL=TypeScriptInternals.js.map