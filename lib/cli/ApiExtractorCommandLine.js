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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiExtractorCommandLine = void 0;
const colors_1 = __importDefault(require("colors"));
const os = __importStar(require("os"));
const ts_command_line_1 = require("@rushstack/ts-command-line");
const node_core_library_1 = require("@rushstack/node-core-library");
const RunAction_1 = require("./RunAction");
const InitAction_1 = require("./InitAction");
class ApiExtractorCommandLine extends ts_command_line_1.CommandLineParser {
    constructor() {
        super({
            toolFilename: 'api-extractor',
            toolDescription: 'API Extractor helps you build better TypeScript libraries.  It analyzes the main entry' +
                ' point for your package, collects the inventory of exported declarations, and then generates three kinds' +
                ' of output:  an API report file (.api.md) to facilitate reviews, a declaration rollup (.d.ts) to be' +
                ' published with your NPM package, and a doc model file (.api.json) to be used with a documentation' +
                ' tool such as api-documenter.  For details, please visit the web site.'
        });
        this._populateActions();
    }
    onDefineParameters() {
        // override
        this._debugParameter = this.defineFlagParameter({
            parameterLongName: '--debug',
            parameterShortName: '-d',
            description: 'Show the full call stack if an error occurs while executing the tool'
        });
    }
    onExecute() {
        // override
        if (this._debugParameter.value) {
            node_core_library_1.InternalError.breakInDebugger = true;
        }
        return super.onExecute().catch((error) => {
            if (this._debugParameter.value) {
                console.error(os.EOL + error.stack);
            }
            else {
                console.error(os.EOL + colors_1.default.red('ERROR: ' + error.message.trim()));
            }
            process.exitCode = 1;
        });
    }
    _populateActions() {
        this.addAction(new InitAction_1.InitAction(this));
        this.addAction(new RunAction_1.RunAction(this));
    }
}
exports.ApiExtractorCommandLine = ApiExtractorCommandLine;
//# sourceMappingURL=ApiExtractorCommandLine.js.map