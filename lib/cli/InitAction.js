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
exports.InitAction = void 0;
const colors_1 = __importDefault(require("colors"));
const path = __importStar(require("path"));
const node_core_library_1 = require("@rushstack/node-core-library");
const ts_command_line_1 = require("@rushstack/ts-command-line");
const ExtractorConfig_1 = require("../api/ExtractorConfig");
class InitAction extends ts_command_line_1.CommandLineAction {
    constructor(parser) {
        super({
            actionName: 'init',
            summary: `Create an ${ExtractorConfig_1.ExtractorConfig.FILENAME} config file`,
            documentation: `Use this command when setting up API Extractor for a new project.  It writes an` +
                ` ${ExtractorConfig_1.ExtractorConfig.FILENAME} config file template with code comments that describe all the settings.` +
                ` The file will be written in the current directory.`
        });
    }
    onDefineParameters() {
        // override
        // No parameters yet
    }
    async onExecute() {
        // override
        const inputFilePath = path.resolve(__dirname, '../schemas/api-extractor-template.json');
        const outputFilePath = path.resolve(ExtractorConfig_1.ExtractorConfig.FILENAME);
        if (node_core_library_1.FileSystem.exists(outputFilePath)) {
            console.log(colors_1.default.red('The output file already exists:'));
            console.log('\n  ' + outputFilePath + '\n');
            throw new Error('Unable to write output file');
        }
        console.log(colors_1.default.green('Writing file: ') + outputFilePath);
        node_core_library_1.FileSystem.copyFile({
            sourcePath: inputFilePath,
            destinationPath: outputFilePath
        });
        console.log('\nThe recommended location for this file is in the project\'s "config" subfolder,\n' +
            'or else in the top-level folder with package.json.');
    }
}
exports.InitAction = InitAction;
//# sourceMappingURL=InitAction.js.map