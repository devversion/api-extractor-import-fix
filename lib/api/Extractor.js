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
exports.Extractor = exports.ExtractorResult = void 0;
const path = __importStar(require("path"));
const semver = __importStar(require("semver"));
const ts = __importStar(require("typescript"));
const resolve = __importStar(require("resolve"));
const node_core_library_1 = require("@rushstack/node-core-library");
const ExtractorConfig_1 = require("./ExtractorConfig");
const Collector_1 = require("../collector/Collector");
const DtsRollupGenerator_1 = require("../generators/DtsRollupGenerator");
const ApiModelGenerator_1 = require("../generators/ApiModelGenerator");
const ApiReportGenerator_1 = require("../generators/ApiReportGenerator");
const PackageMetadataManager_1 = require("../analyzer/PackageMetadataManager");
const ValidationEnhancer_1 = require("../enhancers/ValidationEnhancer");
const DocCommentEnhancer_1 = require("../enhancers/DocCommentEnhancer");
const CompilerState_1 = require("./CompilerState");
const MessageRouter_1 = require("../collector/MessageRouter");
const tsdoc_config_1 = require("@microsoft/tsdoc-config");
/**
 * This object represents the outcome of an invocation of API Extractor.
 *
 * @public
 */
class ExtractorResult {
    /** @internal */
    constructor(properties) {
        this.compilerState = properties.compilerState;
        this.extractorConfig = properties.extractorConfig;
        this.succeeded = properties.succeeded;
        this.apiReportChanged = properties.apiReportChanged;
        this.errorCount = properties.errorCount;
        this.warningCount = properties.warningCount;
    }
}
exports.ExtractorResult = ExtractorResult;
/**
 * The starting point for invoking the API Extractor tool.
 * @public
 */
class Extractor {
    /**
     * Returns the version number of the API Extractor NPM package.
     */
    static get version() {
        return Extractor._getPackageJson().version;
    }
    /**
     * Returns the package name of the API Extractor NPM package.
     */
    static get packageName() {
        return Extractor._getPackageJson().name;
    }
    static _getPackageJson() {
        return node_core_library_1.PackageJsonLookup.loadOwnPackageJson(__dirname);
    }
    /**
     * Load the api-extractor.json config file from the specified path, and then invoke API Extractor.
     */
    static loadConfigAndInvoke(configFilePath, options) {
        const extractorConfig = ExtractorConfig_1.ExtractorConfig.loadFileAndPrepare(configFilePath);
        return Extractor.invoke(extractorConfig, options);
    }
    /**
     * Invoke API Extractor using an already prepared `ExtractorConfig` object.
     */
    static invoke(extractorConfig, options) {
        if (!options) {
            options = {};
        }
        const localBuild = options.localBuild || false;
        let compilerState;
        if (options.compilerState) {
            compilerState = options.compilerState;
        }
        else {
            compilerState = CompilerState_1.CompilerState.create(extractorConfig, options);
        }
        const messageRouter = new MessageRouter_1.MessageRouter({
            workingPackageFolder: extractorConfig.packageFolder,
            messageCallback: options.messageCallback,
            messagesConfig: extractorConfig.messages || {},
            showVerboseMessages: !!options.showVerboseMessages,
            showDiagnostics: !!options.showDiagnostics,
            tsdocConfiguration: extractorConfig.tsdocConfiguration
        });
        if (extractorConfig.tsdocConfigFile.filePath && !extractorConfig.tsdocConfigFile.fileNotFound) {
            if (!node_core_library_1.Path.isEqual(extractorConfig.tsdocConfigFile.filePath, ExtractorConfig_1.ExtractorConfig._tsdocBaseFilePath)) {
                messageRouter.logVerbose("console-using-custom-tsdoc-config" /* UsingCustomTSDocConfig */, 'Using custom TSDoc config from ' + extractorConfig.tsdocConfigFile.filePath);
            }
        }
        this._checkCompilerCompatibility(extractorConfig, messageRouter);
        if (messageRouter.showDiagnostics) {
            messageRouter.logDiagnostic('');
            messageRouter.logDiagnosticHeader('Final prepared ExtractorConfig');
            messageRouter.logDiagnostic(extractorConfig.getDiagnosticDump());
            messageRouter.logDiagnosticFooter();
            messageRouter.logDiagnosticHeader('Compiler options');
            const serializedCompilerOptions = MessageRouter_1.MessageRouter.buildJsonDumpObject(compilerState.program.getCompilerOptions());
            messageRouter.logDiagnostic(JSON.stringify(serializedCompilerOptions, undefined, 2));
            messageRouter.logDiagnosticFooter();
            messageRouter.logDiagnosticHeader('TSDoc configuration');
            // Convert the TSDocConfiguration into a tsdoc.json representation
            const combinedConfigFile = tsdoc_config_1.TSDocConfigFile.loadFromParser(extractorConfig.tsdocConfiguration);
            const serializedTSDocConfig = MessageRouter_1.MessageRouter.buildJsonDumpObject(combinedConfigFile.saveToObject());
            messageRouter.logDiagnostic(JSON.stringify(serializedTSDocConfig, undefined, 2));
            messageRouter.logDiagnosticFooter();
        }
        const collector = new Collector_1.Collector({
            program: compilerState.program,
            messageRouter,
            extractorConfig: extractorConfig
        });
        collector.analyze();
        DocCommentEnhancer_1.DocCommentEnhancer.analyze(collector);
        ValidationEnhancer_1.ValidationEnhancer.analyze(collector);
        const modelBuilder = new ApiModelGenerator_1.ApiModelGenerator(collector);
        const apiPackage = modelBuilder.buildApiPackage();
        if (messageRouter.showDiagnostics) {
            messageRouter.logDiagnostic(''); // skip a line after any diagnostic messages
        }
        if (extractorConfig.docModelEnabled) {
            messageRouter.logVerbose("console-writing-doc-model-file" /* WritingDocModelFile */, 'Writing: ' + extractorConfig.apiJsonFilePath);
            apiPackage.saveToJsonFile(extractorConfig.apiJsonFilePath, {
                toolPackage: Extractor.packageName,
                toolVersion: Extractor.version,
                newlineConversion: extractorConfig.newlineKind,
                ensureFolderExists: true,
                testMode: extractorConfig.testMode
            });
        }
        let apiReportChanged = false;
        if (extractorConfig.apiReportEnabled) {
            const actualApiReportPath = extractorConfig.reportTempFilePath;
            const actualApiReportShortPath = extractorConfig._getShortFilePath(extractorConfig.reportTempFilePath);
            const expectedApiReportPath = extractorConfig.reportFilePath;
            const expectedApiReportShortPath = extractorConfig._getShortFilePath(extractorConfig.reportFilePath);
            const actualApiReportContent = ApiReportGenerator_1.ApiReportGenerator.generateReviewFileContent(collector);
            // Write the actual file
            node_core_library_1.FileSystem.writeFile(actualApiReportPath, actualApiReportContent, {
                ensureFolderExists: true,
                convertLineEndings: extractorConfig.newlineKind
            });
            // Compare it against the expected file
            if (node_core_library_1.FileSystem.exists(expectedApiReportPath)) {
                const expectedApiReportContent = node_core_library_1.FileSystem.readFile(expectedApiReportPath);
                if (!ApiReportGenerator_1.ApiReportGenerator.areEquivalentApiFileContents(actualApiReportContent, expectedApiReportContent)) {
                    apiReportChanged = true;
                    if (!localBuild) {
                        // For a production build, issue a warning that will break the CI build.
                        messageRouter.logWarning("console-api-report-not-copied" /* ApiReportNotCopied */, 'You have changed the public API signature for this project.' +
                            ` Please copy the file "${actualApiReportShortPath}" to "${expectedApiReportShortPath}",` +
                            ` or perform a local build (which does this automatically).` +
                            ` See the Git repo documentation for more info.`);
                    }
                    else {
                        // For a local build, just copy the file automatically.
                        messageRouter.logWarning("console-api-report-copied" /* ApiReportCopied */, 'You have changed the public API signature for this project.' +
                            ` Updating ${expectedApiReportShortPath}`);
                        node_core_library_1.FileSystem.writeFile(expectedApiReportPath, actualApiReportContent, {
                            ensureFolderExists: true,
                            convertLineEndings: extractorConfig.newlineKind
                        });
                    }
                }
                else {
                    messageRouter.logVerbose("console-api-report-unchanged" /* ApiReportUnchanged */, `The API report is up to date: ${actualApiReportShortPath}`);
                }
            }
            else {
                // The target file does not exist, so we are setting up the API review file for the first time.
                //
                // NOTE: People sometimes make a mistake where they move a project and forget to update the "reportFolder"
                // setting, which causes a new file to silently get written to the wrong place.  This can be confusing.
                // Thus we treat the initial creation of the file specially.
                apiReportChanged = true;
                if (!localBuild) {
                    // For a production build, issue a warning that will break the CI build.
                    messageRouter.logWarning("console-api-report-not-copied" /* ApiReportNotCopied */, 'The API report file is missing.' +
                        ` Please copy the file "${actualApiReportShortPath}" to "${expectedApiReportShortPath}",` +
                        ` or perform a local build (which does this automatically).` +
                        ` See the Git repo documentation for more info.`);
                }
                else {
                    const expectedApiReportFolder = path.dirname(expectedApiReportPath);
                    if (!node_core_library_1.FileSystem.exists(expectedApiReportFolder)) {
                        messageRouter.logError("console-api-report-folder-missing" /* ApiReportFolderMissing */, 'Unable to create the API report file. Please make sure the target folder exists:\n' +
                            expectedApiReportFolder);
                    }
                    else {
                        node_core_library_1.FileSystem.writeFile(expectedApiReportPath, actualApiReportContent, {
                            convertLineEndings: extractorConfig.newlineKind
                        });
                        messageRouter.logWarning("console-api-report-created" /* ApiReportCreated */, 'The API report file was missing, so a new file was created. Please add this file to Git:\n' +
                            expectedApiReportPath);
                    }
                }
            }
        }
        if (extractorConfig.rollupEnabled) {
            Extractor._generateRollupDtsFile(collector, extractorConfig.publicTrimmedFilePath, DtsRollupGenerator_1.DtsRollupKind.PublicRelease, extractorConfig.newlineKind);
            Extractor._generateRollupDtsFile(collector, extractorConfig.betaTrimmedFilePath, DtsRollupGenerator_1.DtsRollupKind.BetaRelease, extractorConfig.newlineKind);
            Extractor._generateRollupDtsFile(collector, extractorConfig.untrimmedFilePath, DtsRollupGenerator_1.DtsRollupKind.InternalRelease, extractorConfig.newlineKind);
        }
        if (extractorConfig.tsdocMetadataEnabled) {
            // Write the tsdoc-metadata.json file for this project
            PackageMetadataManager_1.PackageMetadataManager.writeTsdocMetadataFile(extractorConfig.tsdocMetadataFilePath, extractorConfig.newlineKind);
        }
        // Show all the messages that we collected during analysis
        messageRouter.handleRemainingNonConsoleMessages();
        // Determine success
        let succeeded;
        if (localBuild) {
            // For a local build, fail if there were errors (but ignore warnings)
            succeeded = messageRouter.errorCount === 0;
        }
        else {
            // For a production build, fail if there were any errors or warnings
            succeeded = messageRouter.errorCount + messageRouter.warningCount === 0;
        }
        return new ExtractorResult({
            compilerState,
            extractorConfig,
            succeeded,
            apiReportChanged,
            errorCount: messageRouter.errorCount,
            warningCount: messageRouter.warningCount
        });
    }
    static _checkCompilerCompatibility(extractorConfig, messageRouter) {
        messageRouter.logInfo("console-preamble" /* Preamble */, `Analysis will use the bundled TypeScript version ${ts.version}`);
        try {
            const typescriptPath = resolve.sync('typescript', {
                basedir: extractorConfig.projectFolder,
                preserveSymlinks: false
            });
            const packageJsonLookup = new node_core_library_1.PackageJsonLookup();
            const packageJson = packageJsonLookup.tryLoadNodePackageJsonFor(typescriptPath);
            if (packageJson && packageJson.version && semver.valid(packageJson.version)) {
                // Consider a newer MINOR release to be incompatible
                const ourMajor = semver.major(ts.version);
                const ourMinor = semver.minor(ts.version);
                const theirMajor = semver.major(packageJson.version);
                const theirMinor = semver.minor(packageJson.version);
                if (theirMajor > ourMajor || (theirMajor === ourMajor && theirMinor > ourMinor)) {
                    messageRouter.logInfo("console-compiler-version-notice" /* CompilerVersionNotice */, `*** The target project appears to use TypeScript ${packageJson.version} which is newer than the` +
                        ` bundled compiler engine; consider upgrading API Extractor.`);
                }
            }
        }
        catch (e) {
            // The compiler detection heuristic is not expected to work in many configurations
        }
    }
    static _generateRollupDtsFile(collector, outputPath, dtsKind, newlineKind) {
        if (outputPath !== '') {
            collector.messageRouter.logVerbose("console-writing-dts-rollup" /* WritingDtsRollup */, `Writing package typings: ${outputPath}`);
            DtsRollupGenerator_1.DtsRollupGenerator.writeTypingsFile(collector, outputPath, dtsKind, newlineKind);
        }
    }
}
exports.Extractor = Extractor;
//# sourceMappingURL=Extractor.js.map