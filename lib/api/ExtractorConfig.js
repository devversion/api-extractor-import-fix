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
exports.ExtractorConfig = void 0;
const path = __importStar(require("path"));
const resolve = __importStar(require("resolve"));
const lodash = require("lodash");
const node_core_library_1 = require("@rushstack/node-core-library");
const rig_package_1 = require("@rushstack/rig-package");
const PackageMetadataManager_1 = require("../analyzer/PackageMetadataManager");
const MessageRouter_1 = require("../collector/MessageRouter");
const tsdoc_1 = require("@microsoft/tsdoc");
const tsdoc_config_1 = require("@microsoft/tsdoc-config");
/**
 * The `ExtractorConfig` class loads, validates, interprets, and represents the api-extractor.json config file.
 * @public
 */
class ExtractorConfig {
    constructor(parameters) {
        this.projectFolder = parameters.projectFolder;
        this.packageJson = parameters.packageJson;
        this.packageFolder = parameters.packageFolder;
        this.mainEntryPointFilePath = parameters.mainEntryPointFilePath;
        this.bundledPackages = parameters.bundledPackages;
        this.tsconfigFilePath = parameters.tsconfigFilePath;
        this.overrideTsconfig = parameters.overrideTsconfig;
        this.skipLibCheck = parameters.skipLibCheck;
        this.apiReportEnabled = parameters.apiReportEnabled;
        this.reportFilePath = parameters.reportFilePath;
        this.reportTempFilePath = parameters.reportTempFilePath;
        this.docModelEnabled = parameters.docModelEnabled;
        this.apiJsonFilePath = parameters.apiJsonFilePath;
        this.rollupEnabled = parameters.rollupEnabled;
        this.untrimmedFilePath = parameters.untrimmedFilePath;
        this.betaTrimmedFilePath = parameters.betaTrimmedFilePath;
        this.publicTrimmedFilePath = parameters.publicTrimmedFilePath;
        this.omitTrimmingComments = parameters.omitTrimmingComments;
        this.tsdocMetadataEnabled = parameters.tsdocMetadataEnabled;
        this.tsdocMetadataFilePath = parameters.tsdocMetadataFilePath;
        this.tsdocConfigFile = parameters.tsdocConfigFile;
        this.tsdocConfiguration = parameters.tsdocConfiguration;
        this.newlineKind = parameters.newlineKind;
        this.messages = parameters.messages;
        this.testMode = parameters.testMode;
    }
    /**
     * Returns a JSON-like string representing the `ExtractorConfig` state, which can be printed to a console
     * for diagnostic purposes.
     *
     * @remarks
     * This is used by the "--diagnostics" command-line option.  The string is not intended to be deserialized;
     * its format may be changed at any time.
     */
    getDiagnosticDump() {
        // Handle the simple JSON-serializable properties using buildJsonDumpObject()
        const result = MessageRouter_1.MessageRouter.buildJsonDumpObject(this, {
            keyNamesToOmit: ['tsdocConfigFile', 'tsdocConfiguration']
        });
        // Implement custom formatting for tsdocConfigFile and tsdocConfiguration
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        result.tsdocConfigFile = {
            filePath: this.tsdocConfigFile.filePath,
            log: this.tsdocConfigFile.log.messages.map((x) => x.toString())
        };
        return JSON.stringify(result, undefined, 2);
    }
    /**
     * Returns a simplified file path for use in error messages.
     * @internal
     */
    _getShortFilePath(absolutePath) {
        if (!path.isAbsolute(absolutePath)) {
            throw new node_core_library_1.InternalError('Expected absolute path: ' + absolutePath);
        }
        if (node_core_library_1.Path.isUnderOrEqual(absolutePath, this.projectFolder)) {
            return node_core_library_1.Path.convertToSlashes(path.relative(this.projectFolder, absolutePath));
        }
        return absolutePath;
    }
    /**
     * Searches for the api-extractor.json config file associated with the specified starting folder,
     * and loads the file if found.  This lookup supports
     * {@link https://www.npmjs.com/package/@rushstack/rig-package | rig packages}.
     *
     * @remarks
     * The search will first look for a package.json file in a parent folder of the starting folder;
     * if found, that will be used as the base folder instead of the starting folder.  If the config
     * file is not found in `<baseFolder>/api-extractor.json` or `<baseFolder>/config/api-extractor.json`,
     * then `<baseFolder/config/rig.json` will be checked to see whether a
     * {@link https://www.npmjs.com/package/@rushstack/rig-package | rig package} is referenced; if so then
     * the rig's api-extractor.json file will be used instead.  If a config file is found, it will be loaded
     * and returned with the `IExtractorConfigPrepareOptions` object. Otherwise, `undefined` is returned
     * to indicate that API Extractor does not appear to be configured for the specified folder.
     *
     * @returns An options object that can be passed to {@link ExtractorConfig.prepare}, or `undefined`
     * if not api-extractor.json file was found.
     */
    static tryLoadForFolder(options) {
        const packageJsonLookup = options.packageJsonLookup || new node_core_library_1.PackageJsonLookup();
        const startingFolder = options.startingFolder;
        // Figure out which project we're in and look for the config file at the project root
        const packageJsonFullPath = packageJsonLookup.tryGetPackageJsonFilePathFor(startingFolder);
        const packageFolder = packageJsonFullPath
            ? path.dirname(packageJsonFullPath)
            : undefined;
        // If there is no package, then just use the starting folder
        const baseFolder = packageFolder || startingFolder;
        let projectFolderLookupToken = undefined;
        // First try the standard "config" subfolder:
        let configFilename = path.join(baseFolder, 'config', ExtractorConfig.FILENAME);
        if (node_core_library_1.FileSystem.exists(configFilename)) {
            if (node_core_library_1.FileSystem.exists(path.join(baseFolder, ExtractorConfig.FILENAME))) {
                throw new Error(`Found conflicting ${ExtractorConfig.FILENAME} files in "." and "./config" folders`);
            }
        }
        else {
            // Otherwise try the top-level folder
            configFilename = path.join(baseFolder, ExtractorConfig.FILENAME);
            if (!node_core_library_1.FileSystem.exists(configFilename)) {
                // If We didn't find it in <packageFolder>/api-extractor.json or <packageFolder>/config/api-extractor.json
                // then check for a rig package
                if (packageFolder) {
                    let rigConfig;
                    if (options.rigConfig) {
                        // The caller provided an already solved RigConfig.  Double-check that it is for the right project.
                        if (!node_core_library_1.Path.isEqual(options.rigConfig.projectFolderPath, packageFolder)) {
                            throw new Error('The provided ILoadForFolderOptions.rigConfig is for the wrong project folder:\n' +
                                '\nExpected path: ' +
                                packageFolder +
                                '\nProvided path: ' +
                                options.rigConfig.projectFolderOriginalPath);
                        }
                        rigConfig = options.rigConfig;
                    }
                    else {
                        rigConfig = rig_package_1.RigConfig.loadForProjectFolder({
                            projectFolderPath: packageFolder
                        });
                    }
                    if (rigConfig.rigFound) {
                        configFilename = path.join(rigConfig.getResolvedProfileFolder(), ExtractorConfig.FILENAME);
                        // If the "projectFolder" setting isn't specified in api-extractor.json, it defaults to the
                        // "<lookup>" token which will probe for the tsconfig.json nearest to the api-extractor.json path.
                        // But this won't work if api-extractor.json belongs to the rig.  So instead "<lookup>" should be
                        // the "<packageFolder>" that referenced the rig.
                        projectFolderLookupToken = packageFolder;
                    }
                }
                if (!node_core_library_1.FileSystem.exists(configFilename)) {
                    // API Extractor does not seem to be configured for this folder
                    return undefined;
                }
            }
        }
        const configObjectFullPath = path.resolve(configFilename);
        const configObject = ExtractorConfig.loadFile(configObjectFullPath);
        return {
            configObject,
            configObjectFullPath,
            packageJsonFullPath,
            projectFolderLookupToken
        };
    }
    /**
     * Loads the api-extractor.json config file from the specified file path, and prepares an `ExtractorConfig` object.
     *
     * @remarks
     * Loads the api-extractor.json config file from the specified file path.   If the "extends" field is present,
     * the referenced file(s) will be merged.  For any omitted fields, the API Extractor default values are merged.
     *
     * The result is prepared using `ExtractorConfig.prepare()`.
     */
    static loadFileAndPrepare(configJsonFilePath) {
        const configObjectFullPath = path.resolve(configJsonFilePath);
        const configObject = ExtractorConfig.loadFile(configObjectFullPath);
        const packageJsonLookup = new node_core_library_1.PackageJsonLookup();
        const packageJsonFullPath = packageJsonLookup.tryGetPackageJsonFilePathFor(configObjectFullPath);
        const extractorConfig = ExtractorConfig.prepare({
            configObject,
            configObjectFullPath,
            packageJsonFullPath
        });
        return extractorConfig;
    }
    /**
     * Performs only the first half of {@link ExtractorConfig.loadFileAndPrepare}, providing an opportunity to
     * modify the object before it is passed to {@link ExtractorConfig.prepare}.
     *
     * @remarks
     * Loads the api-extractor.json config file from the specified file path.   If the "extends" field is present,
     * the referenced file(s) will be merged.  For any omitted fields, the API Extractor default values are merged.
     */
    static loadFile(jsonFilePath) {
        // Set to keep track of config files which have been processed.
        const visitedPaths = new Set();
        let currentConfigFilePath = path.resolve(jsonFilePath);
        let configObject = {};
        try {
            do {
                // Check if this file was already processed.
                if (visitedPaths.has(currentConfigFilePath)) {
                    throw new Error(`The API Extractor "extends" setting contains a cycle.` +
                        `  This file is included twice: "${currentConfigFilePath}"`);
                }
                visitedPaths.add(currentConfigFilePath);
                const currentConfigFolderPath = path.dirname(currentConfigFilePath);
                // Load the extractor config defined in extends property.
                const baseConfig = node_core_library_1.JsonFile.load(currentConfigFilePath);
                let extendsField = baseConfig.extends || '';
                // Delete the "extends" field so it doesn't get merged
                delete baseConfig.extends;
                if (extendsField) {
                    if (extendsField.match(/^\.\.?[\\/]/)) {
                        // EXAMPLE:  "./subfolder/api-extractor-base.json"
                        extendsField = path.resolve(currentConfigFolderPath, extendsField);
                    }
                    else {
                        // EXAMPLE:  "my-package/api-extractor-base.json"
                        //
                        // Resolve "my-package" from the perspective of the current folder.
                        try {
                            extendsField = resolve.sync(extendsField, {
                                basedir: currentConfigFolderPath
                            });
                        }
                        catch (e) {
                            throw new Error(`Error resolving NodeJS path "${extendsField}": ${e.message}`);
                        }
                    }
                }
                // This step has to be performed in advance, since the currentConfigFolderPath information will be lost
                // after lodash.merge() is performed.
                ExtractorConfig._resolveConfigFileRelativePaths(baseConfig, currentConfigFolderPath);
                // Merge extractorConfig into baseConfig, mutating baseConfig
                lodash.merge(baseConfig, configObject);
                configObject = baseConfig;
                currentConfigFilePath = extendsField;
            } while (currentConfigFilePath);
        }
        catch (e) {
            throw new Error(`Error loading ${currentConfigFilePath}:\n` + e.message);
        }
        // Lastly, apply the defaults
        configObject = lodash.merge(lodash.cloneDeep(ExtractorConfig._defaultConfig), configObject);
        ExtractorConfig.jsonSchema.validateObject(configObject, jsonFilePath);
        // The schema validation should ensure that this object conforms to IConfigFile
        return configObject;
    }
    static _resolveConfigFileRelativePaths(configFile, currentConfigFolderPath) {
        if (configFile.projectFolder) {
            configFile.projectFolder = ExtractorConfig._resolveConfigFileRelativePath('projectFolder', configFile.projectFolder, currentConfigFolderPath);
        }
        if (configFile.mainEntryPointFilePath) {
            configFile.mainEntryPointFilePath = ExtractorConfig._resolveConfigFileRelativePath('mainEntryPointFilePath', configFile.mainEntryPointFilePath, currentConfigFolderPath);
        }
        if (configFile.compiler) {
            if (configFile.compiler.tsconfigFilePath) {
                configFile.compiler.tsconfigFilePath = ExtractorConfig._resolveConfigFileRelativePath('tsconfigFilePath', configFile.compiler.tsconfigFilePath, currentConfigFolderPath);
            }
        }
        if (configFile.apiReport) {
            if (configFile.apiReport.reportFolder) {
                configFile.apiReport.reportFolder = ExtractorConfig._resolveConfigFileRelativePath('reportFolder', configFile.apiReport.reportFolder, currentConfigFolderPath);
            }
            if (configFile.apiReport.reportTempFolder) {
                configFile.apiReport.reportTempFolder = ExtractorConfig._resolveConfigFileRelativePath('reportTempFolder', configFile.apiReport.reportTempFolder, currentConfigFolderPath);
            }
        }
        if (configFile.docModel) {
            if (configFile.docModel.apiJsonFilePath) {
                configFile.docModel.apiJsonFilePath = ExtractorConfig._resolveConfigFileRelativePath('apiJsonFilePath', configFile.docModel.apiJsonFilePath, currentConfigFolderPath);
            }
        }
        if (configFile.dtsRollup) {
            if (configFile.dtsRollup.untrimmedFilePath) {
                configFile.dtsRollup.untrimmedFilePath = ExtractorConfig._resolveConfigFileRelativePath('untrimmedFilePath', configFile.dtsRollup.untrimmedFilePath, currentConfigFolderPath);
            }
            if (configFile.dtsRollup.betaTrimmedFilePath) {
                configFile.dtsRollup.betaTrimmedFilePath = ExtractorConfig._resolveConfigFileRelativePath('betaTrimmedFilePath', configFile.dtsRollup.betaTrimmedFilePath, currentConfigFolderPath);
            }
            if (configFile.dtsRollup.publicTrimmedFilePath) {
                configFile.dtsRollup.publicTrimmedFilePath = ExtractorConfig._resolveConfigFileRelativePath('publicTrimmedFilePath', configFile.dtsRollup.publicTrimmedFilePath, currentConfigFolderPath);
            }
        }
        if (configFile.tsdocMetadata) {
            if (configFile.tsdocMetadata.tsdocMetadataFilePath) {
                configFile.tsdocMetadata.tsdocMetadataFilePath = ExtractorConfig._resolveConfigFileRelativePath('tsdocMetadataFilePath', configFile.tsdocMetadata.tsdocMetadataFilePath, currentConfigFolderPath);
            }
        }
    }
    static _resolveConfigFileRelativePath(fieldName, fieldValue, currentConfigFolderPath) {
        if (!path.isAbsolute(fieldValue)) {
            if (fieldValue.indexOf('<projectFolder>') !== 0) {
                // If the path is not absolute and does not start with "<projectFolder>", then resolve it relative
                // to the folder of the config file that it appears in
                return path.join(currentConfigFolderPath, fieldValue);
            }
        }
        return fieldValue;
    }
    /**
     * Prepares an `ExtractorConfig` object using a configuration that is provided as a runtime object,
     * rather than reading it from disk.  This allows configurations to be constructed programmatically,
     * loaded from an alternate source, and/or customized after loading.
     */
    static prepare(options) {
        const filenameForErrors = options.configObjectFullPath || 'the configuration object';
        const configObject = options.configObject;
        if (configObject.extends) {
            throw new Error('The IConfigFile.extends field must be expanded before calling ExtractorConfig.prepare()');
        }
        if (options.configObjectFullPath) {
            if (!path.isAbsolute(options.configObjectFullPath)) {
                throw new Error('The "configObjectFullPath" setting must be an absolute path');
            }
        }
        ExtractorConfig.jsonSchema.validateObject(configObject, filenameForErrors);
        const packageJsonFullPath = options.packageJsonFullPath;
        let packageFolder = undefined;
        let packageJson = undefined;
        if (packageJsonFullPath) {
            if (!/.json$/i.test(packageJsonFullPath)) {
                // Catch common mistakes e.g. where someone passes a folder path instead of a file path
                throw new Error('The "packageJsonFullPath" setting does not have a .json file extension');
            }
            if (!path.isAbsolute(packageJsonFullPath)) {
                throw new Error('The "packageJsonFullPath" setting must be an absolute path');
            }
            if (options.packageJson) {
                packageJson = options.packageJson;
            }
            else {
                const packageJsonLookup = new node_core_library_1.PackageJsonLookup();
                packageJson = packageJsonLookup.loadNodePackageJson(packageJsonFullPath);
            }
            packageFolder = path.dirname(packageJsonFullPath);
        }
        // "tsdocConfigFile" and "tsdocConfiguration" are prepared outside the try-catch block,
        // so that if exceptions are thrown, it will not get the "Error parsing api-extractor.json:" header
        let extractorConfigParameters;
        try {
            if (!configObject.compiler) {
                // A merged configuration should have this
                throw new Error('The "compiler" section is missing');
            }
            if (!configObject.projectFolder) {
                // A merged configuration should have this
                throw new Error('The "projectFolder" setting is missing');
            }
            let projectFolder;
            if (configObject.projectFolder.trim() === '<lookup>') {
                if (options.projectFolderLookupToken) {
                    // Use the manually specified "<lookup>" value
                    projectFolder = options.projectFolderLookupToken;
                    if (!node_core_library_1.FileSystem.exists(options.projectFolderLookupToken)) {
                        throw new Error('The specified "projectFolderLookupToken" path does not exist: ' +
                            options.projectFolderLookupToken);
                    }
                }
                else {
                    if (!options.configObjectFullPath) {
                        throw new Error('The "projectFolder" setting uses the "<lookup>" token, but it cannot be expanded because' +
                            ' the "configObjectFullPath" setting was not specified');
                    }
                    // "The default value for `projectFolder` is the token `<lookup>`, which means the folder is determined
                    // by traversing parent folders, starting from the folder containing api-extractor.json, and stopping
                    // at the first folder that contains a tsconfig.json file.  If a tsconfig.json file cannot be found in
                    // this way, then an error will be reported."
                    let currentFolder = path.dirname(options.configObjectFullPath);
                    for (;;) {
                        const tsconfigPath = path.join(currentFolder, 'tsconfig.json');
                        if (node_core_library_1.FileSystem.exists(tsconfigPath)) {
                            projectFolder = currentFolder;
                            break;
                        }
                        const parentFolder = path.dirname(currentFolder);
                        if (parentFolder === '' || parentFolder === currentFolder) {
                            throw new Error('The "projectFolder" setting uses the "<lookup>" token, but a tsconfig.json file cannot be' +
                                ' found in this folder or any parent folder.');
                        }
                        currentFolder = parentFolder;
                    }
                }
            }
            else {
                ExtractorConfig._rejectAnyTokensInPath(configObject.projectFolder, 'projectFolder');
                if (!node_core_library_1.FileSystem.exists(configObject.projectFolder)) {
                    throw new Error('The specified "projectFolder" path does not exist: ' + configObject.projectFolder);
                }
                projectFolder = configObject.projectFolder;
            }
            const tokenContext = {
                unscopedPackageName: 'unknown-package',
                packageName: 'unknown-package',
                projectFolder: projectFolder
            };
            if (packageJson) {
                tokenContext.packageName = packageJson.name;
                tokenContext.unscopedPackageName = node_core_library_1.PackageName.getUnscopedName(packageJson.name);
            }
            if (!configObject.mainEntryPointFilePath) {
                // A merged configuration should have this
                throw new Error('The "mainEntryPointFilePath" setting is missing');
            }
            const mainEntryPointFilePath = ExtractorConfig._resolvePathWithTokens('mainEntryPointFilePath', configObject.mainEntryPointFilePath, tokenContext);
            if (!ExtractorConfig.hasDtsFileExtension(mainEntryPointFilePath)) {
                throw new Error('The "mainEntryPointFilePath" value is not a declaration file: ' + mainEntryPointFilePath);
            }
            if (!node_core_library_1.FileSystem.exists(mainEntryPointFilePath)) {
                throw new Error('The "mainEntryPointFilePath" path does not exist: ' + mainEntryPointFilePath);
            }
            const bundledPackages = configObject.bundledPackages || [];
            for (const bundledPackage of bundledPackages) {
                if (!node_core_library_1.PackageName.isValidName(bundledPackage)) {
                    throw new Error(`The "bundledPackages" list contains an invalid package name: "${bundledPackage}"`);
                }
            }
            const tsconfigFilePath = ExtractorConfig._resolvePathWithTokens('tsconfigFilePath', configObject.compiler.tsconfigFilePath, tokenContext);
            if (configObject.compiler.overrideTsconfig === undefined) {
                if (!tsconfigFilePath) {
                    throw new Error('Either the "tsconfigFilePath" or "overrideTsconfig" setting must be specified');
                }
                if (!node_core_library_1.FileSystem.exists(tsconfigFilePath)) {
                    throw new Error('The file referenced by "tsconfigFilePath" does not exist: ' + tsconfigFilePath);
                }
            }
            let apiReportEnabled = false;
            let reportFilePath = '';
            let reportTempFilePath = '';
            if (configObject.apiReport) {
                apiReportEnabled = !!configObject.apiReport.enabled;
                const reportFilename = ExtractorConfig._expandStringWithTokens('reportFileName', configObject.apiReport.reportFileName || '', tokenContext);
                if (!reportFilename) {
                    // A merged configuration should have this
                    throw new Error('The "reportFilename" setting is missing');
                }
                if (reportFilename.indexOf('/') >= 0 || reportFilename.indexOf('\\') >= 0) {
                    // A merged configuration should have this
                    throw new Error(`The "reportFilename" setting contains invalid characters: "${reportFilename}"`);
                }
                const reportFolder = ExtractorConfig._resolvePathWithTokens('reportFolder', configObject.apiReport.reportFolder, tokenContext);
                const reportTempFolder = ExtractorConfig._resolvePathWithTokens('reportTempFolder', configObject.apiReport.reportTempFolder, tokenContext);
                reportFilePath = path.join(reportFolder, reportFilename);
                reportTempFilePath = path.join(reportTempFolder, reportFilename);
            }
            let docModelEnabled = false;
            let apiJsonFilePath = '';
            if (configObject.docModel) {
                docModelEnabled = !!configObject.docModel.enabled;
                apiJsonFilePath = ExtractorConfig._resolvePathWithTokens('apiJsonFilePath', configObject.docModel.apiJsonFilePath, tokenContext);
            }
            let tsdocMetadataEnabled = false;
            let tsdocMetadataFilePath = '';
            if (configObject.tsdocMetadata) {
                tsdocMetadataEnabled = !!configObject.tsdocMetadata.enabled;
                if (tsdocMetadataEnabled) {
                    tsdocMetadataFilePath = configObject.tsdocMetadata.tsdocMetadataFilePath || '';
                    if (tsdocMetadataFilePath.trim() === '<lookup>') {
                        if (!packageJson) {
                            throw new Error('The "<lookup>" token cannot be used with the "tsdocMetadataFilePath" setting because' +
                                ' the "packageJson" option was not provided');
                        }
                        if (!packageJsonFullPath) {
                            throw new Error('The "<lookup>" token cannot be used with "tsdocMetadataFilePath" because' +
                                'the "packageJsonFullPath" option was not provided');
                        }
                        tsdocMetadataFilePath = PackageMetadataManager_1.PackageMetadataManager.resolveTsdocMetadataPath(path.dirname(packageJsonFullPath), packageJson);
                    }
                    else {
                        tsdocMetadataFilePath = ExtractorConfig._resolvePathWithTokens('tsdocMetadataFilePath', configObject.tsdocMetadata.tsdocMetadataFilePath, tokenContext);
                    }
                    if (!tsdocMetadataFilePath) {
                        throw new Error('The "tsdocMetadata.enabled" setting is enabled,' +
                            ' but "tsdocMetadataFilePath" is not specified');
                    }
                }
            }
            let rollupEnabled = false;
            let untrimmedFilePath = '';
            let betaTrimmedFilePath = '';
            let publicTrimmedFilePath = '';
            let omitTrimmingComments = false;
            if (configObject.dtsRollup) {
                rollupEnabled = !!configObject.dtsRollup.enabled;
                untrimmedFilePath = ExtractorConfig._resolvePathWithTokens('untrimmedFilePath', configObject.dtsRollup.untrimmedFilePath, tokenContext);
                betaTrimmedFilePath = ExtractorConfig._resolvePathWithTokens('betaTrimmedFilePath', configObject.dtsRollup.betaTrimmedFilePath, tokenContext);
                publicTrimmedFilePath = ExtractorConfig._resolvePathWithTokens('publicTrimmedFilePath', configObject.dtsRollup.publicTrimmedFilePath, tokenContext);
                omitTrimmingComments = !!configObject.dtsRollup.omitTrimmingComments;
            }
            let newlineKind;
            switch (configObject.newlineKind) {
                case 'lf':
                    newlineKind = "\n" /* Lf */;
                    break;
                case 'os':
                    newlineKind = "os" /* OsDefault */;
                    break;
                default:
                    newlineKind = "\r\n" /* CrLf */;
                    break;
            }
            extractorConfigParameters = {
                projectFolder: projectFolder,
                packageJson,
                packageFolder,
                mainEntryPointFilePath,
                bundledPackages,
                tsconfigFilePath,
                overrideTsconfig: configObject.compiler.overrideTsconfig,
                skipLibCheck: !!configObject.compiler.skipLibCheck,
                apiReportEnabled,
                reportFilePath,
                reportTempFilePath,
                docModelEnabled,
                apiJsonFilePath,
                rollupEnabled,
                untrimmedFilePath,
                betaTrimmedFilePath,
                publicTrimmedFilePath,
                omitTrimmingComments,
                tsdocMetadataEnabled,
                tsdocMetadataFilePath,
                newlineKind,
                messages: configObject.messages || {},
                testMode: !!configObject.testMode
            };
        }
        catch (e) {
            throw new Error(`Error parsing ${filenameForErrors}:\n` + e.message);
        }
        let tsdocConfigFile = options.tsdocConfigFile;
        if (!tsdocConfigFile) {
            // Example: "my-project/tsdoc.json"
            let packageTSDocConfigPath = tsdoc_config_1.TSDocConfigFile.findConfigPathForFolder(extractorConfigParameters.projectFolder);
            if (!packageTSDocConfigPath || !node_core_library_1.FileSystem.exists(packageTSDocConfigPath)) {
                // If the project does not have a tsdoc.json config file, then use API Extractor's base file.
                packageTSDocConfigPath = ExtractorConfig._tsdocBaseFilePath;
                if (!node_core_library_1.FileSystem.exists(packageTSDocConfigPath)) {
                    throw new node_core_library_1.InternalError('Unable to load the built-in TSDoc config file: ' + packageTSDocConfigPath);
                }
            }
            tsdocConfigFile = tsdoc_config_1.TSDocConfigFile.loadFile(packageTSDocConfigPath);
        }
        // IMPORTANT: After calling TSDocConfigFile.loadFile(), we need to check for errors.
        if (tsdocConfigFile.hasErrors) {
            throw new Error(tsdocConfigFile.getErrorSummary());
        }
        const tsdocConfiguration = new tsdoc_1.TSDocConfiguration();
        tsdocConfigFile.configureParser(tsdocConfiguration);
        // IMPORTANT: After calling TSDocConfigFile.configureParser(), we need to check for errors a second time.
        if (tsdocConfigFile.hasErrors) {
            throw new Error(tsdocConfigFile.getErrorSummary());
        }
        return new ExtractorConfig(Object.assign(Object.assign({}, extractorConfigParameters), { tsdocConfigFile, tsdocConfiguration }));
    }
    static _resolvePathWithTokens(fieldName, value, tokenContext) {
        value = ExtractorConfig._expandStringWithTokens(fieldName, value, tokenContext);
        if (value !== '') {
            value = path.resolve(tokenContext.projectFolder, value);
        }
        return value;
    }
    static _expandStringWithTokens(fieldName, value, tokenContext) {
        value = value ? value.trim() : '';
        if (value !== '') {
            value = node_core_library_1.Text.replaceAll(value, '<unscopedPackageName>', tokenContext.unscopedPackageName);
            value = node_core_library_1.Text.replaceAll(value, '<packageName>', tokenContext.packageName);
            const projectFolderToken = '<projectFolder>';
            if (value.indexOf(projectFolderToken) === 0) {
                // Replace "<projectFolder>" at the start of a string
                value = path.join(tokenContext.projectFolder, value.substr(projectFolderToken.length));
            }
            if (value.indexOf(projectFolderToken) >= 0) {
                // If after all replacements, "<projectFolder>" appears somewhere in the string, report an error
                throw new Error(`The "${fieldName}" value incorrectly uses the "<projectFolder>" token.` +
                    ` It must appear at the start of the string.`);
            }
            if (value.indexOf('<lookup>') >= 0) {
                throw new Error(`The "${fieldName}" value incorrectly uses the "<lookup>" token`);
            }
            ExtractorConfig._rejectAnyTokensInPath(value, fieldName);
        }
        return value;
    }
    /**
     * Returns true if the specified file path has the ".d.ts" file extension.
     */
    static hasDtsFileExtension(filePath) {
        return ExtractorConfig._declarationFileExtensionRegExp.test(filePath);
    }
    /**
     * Given a path string that may have originally contained expandable tokens such as `<projectFolder>"`
     * this reports an error if any token-looking substrings remain after expansion (e.g. `c:\blah\<invalid>\blah`).
     */
    static _rejectAnyTokensInPath(value, fieldName) {
        if (value.indexOf('<') < 0 && value.indexOf('>') < 0) {
            return;
        }
        // Can we determine the name of a token?
        const tokenRegExp = /(\<[^<]*?\>)/;
        const match = tokenRegExp.exec(value);
        if (match) {
            throw new Error(`The "${fieldName}" value contains an unrecognized token "${match[1]}"`);
        }
        throw new Error(`The "${fieldName}" value contains extra token characters ("<" or ">"): ${value}`);
    }
}
exports.ExtractorConfig = ExtractorConfig;
/**
 * The JSON Schema for API Extractor config file (api-extractor.schema.json).
 */
ExtractorConfig.jsonSchema = node_core_library_1.JsonSchema.fromFile(path.join(__dirname, '../schemas/api-extractor.schema.json'));
/**
 * The config file name "api-extractor.json".
 */
ExtractorConfig.FILENAME = 'api-extractor.json';
/**
 * The full path to `extends/tsdoc-base.json` which contains the standard TSDoc configuration
 * for API Extractor.
 * @internal
 */
ExtractorConfig._tsdocBaseFilePath = path.resolve(__dirname, '../../extends/tsdoc-base.json');
ExtractorConfig._defaultConfig = node_core_library_1.JsonFile.load(path.join(__dirname, '../schemas/api-extractor-defaults.json'));
ExtractorConfig._declarationFileExtensionRegExp = /\.d\.ts$/i;
//# sourceMappingURL=ExtractorConfig.js.map