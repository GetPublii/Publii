const fs = require('fs-extra');
const path = require('path');
const ipcMain = require('electron').ipcMain;
const Import = require('../modules/import/import.js');
const WordPressImportReport = require('../modules/import/wordpress-import-report.js');
const childProcess = require('child_process');
const PathValidator = require('../helpers/path-validator.js');

const { isValidDirSegment } = PathValidator;

/*
 * Events for the IPC communication regarding imports
 */

class ImportEvents {
    /**
     * Creating an events instance
     *
     * @param appInstance
     */
    constructor(appInstance) {
        let self = this;
        this.app = appInstance;
        this.reportStore = new WordPressImportReport(appInstance);

        /*
         * Import WXR file
         */
        ipcMain.on('app-wxr-check', function(event, config) {
            if (!self.validateImportInput(config, false)) {
                event.sender.send('app-wxr-checked', {
                    status: 'error',
                    message: 'Invalid import parameters'
                });
                return;
            }

            self.checkFile(config.siteName, config.filePath, event.sender);
        });

        ipcMain.on('app-wxr-import', function(event, config) {
            if (!self.validateImportInput(config, true)) {
                event.sender.send('app-wxr-imported', {
                    type: 'result',
                    status: 'error',
                    message: 'Invalid import parameters'
                });
                return;
            }

            self.importFile(appInstance, config, event.sender);
        });

        ipcMain.handle('app-wxr-report-load', function(event, siteName) {
            return self.reportStore.load(siteName);
        });
    }

    /**
     * Returns true when the supplied site exists in the current Publii library.
     */
    validateSiteName(siteName) {
        if (!isValidDirSegment(siteName)) {
            return false;
        }

        let sitePath = path.join(this.app.sitesDir, siteName);

        try {
            return fs.existsSync(sitePath) && fs.statSync(sitePath).isDirectory();
        } catch (e) {
            return false;
        }
    }

    /**
     * Validates siteName and filePath supplied from the renderer.
     */
    validateImportInput(config, validateOptions = false) {
        if (!config || typeof config !== 'object') {
            return false;
        }

        if (!this.validateSiteName(config.siteName)) {
            return false;
        }

        if (typeof config.filePath !== 'string' ||
            config.filePath.length === 0 ||
            config.filePath.indexOf('\0') !== -1 ||
            !path.isAbsolute(config.filePath)) {
            return false;
        }

        try {
            if (!fs.existsSync(config.filePath) || !fs.statSync(config.filePath).isFile()) {
                return false;
            }
        } catch (e) {
            return false;
        }

        if (validateOptions) {
            let seoProvider = typeof config.seoProvider === 'undefined' ? 'auto' : config.seoProvider;

            if (!['publii-author', 'wp-authors'].includes(config.importAuthors) ||
                !['tags', 'categories', 'both'].includes(config.usedTaxonomy) ||
                !['wordpress', 'title'].includes(config.slugStrategy) ||
                !['auto', 'yoast', 'rank-math', 'aioseo', 'none'].includes(seoProvider) ||
                typeof config.autop !== 'boolean' ||
                typeof config.importMenus !== 'boolean' ||
                !Array.isArray(config.postTypes) ||
                config.postTypes.length > 100 ||
                config.postTypes.some(type => typeof type !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(type))) {
                return false;
            }
        }

        return true;
    }

    /**
     * Checking the WXR file
     *
     * @param siteName
     * @param filePath
     */
    checkFile(siteName, filePath, sender) {
        let stdoutFd = fs.openSync(this.app.app.getPath('logs') + "/import-check-process.log", "w");
        let stderrFd = fs.openSync(this.app.app.getPath('logs') + "/import-check-errors.log", "w");
        let importProcess;

        try {
            importProcess = childProcess.fork(__dirname + '/../workers/import/check', {
                stdio: [null, stdoutFd, stderrFd, 'ipc']
            });
        } finally {
            fs.closeSync(stdoutFd);
            fs.closeSync(stderrFd);
        }

        let completed = false;
        let sendFailure = data => {
            if (completed) {
                return;
            }

            completed = true;
            sender.send('app-wxr-checked', data);
        };

        importProcess.on('message', function(data) {
            if (!completed) {
                completed = true;
                sender.send('app-wxr-checked', data);
            }
        });
        importProcess.on('error', error => sendFailure({
            status: 'error',
            message: error.message || 'Unable to start the WordPress import checker.'
        }));
        importProcess.on('exit', code => {
            if (!completed) {
                sendFailure({
                    status: 'error',
                    message: code === 0 ? 'The WordPress import checker returned no result.' : 'The WordPress import checker stopped unexpectedly.'
                });
            }
        });

        importProcess.send({
            type: 'dependencies',
            siteName: siteName,
            filePath: filePath
        });
    }

    /**
     * Imports data from the WXR file
     *
     * @param appInstance
     * @param config
     */
    importFile(appInstance, config, sender) {
        let stdoutFd = fs.openSync(this.app.app.getPath('logs') + "/import-process.log", "w");
        let stderrFd = fs.openSync(this.app.app.getPath('logs') + "/import-errors.log", "w");
        let reportStore = this.reportStore;
        let importProcess;

        try {
            importProcess = childProcess.fork(__dirname + '/../workers/import/import', {
                stdio: [null, stdoutFd, stderrFd, 'ipc']
            });
        } finally {
            fs.closeSync(stdoutFd);
            fs.closeSync(stderrFd);
        }

        let completed = false;
        let sendFailure = message => {
            if (completed) {
                return;
            }

            completed = true;
            sender.send('app-wxr-imported', {
                type: 'result',
                status: 'error',
                message
            });
        };
        importProcess.on('message', function(data) {
            if(data.type === 'result') {
                if (!completed) {
                    reportStore.persistImportResult(config.siteName, data);

                    completed = true;
                    sender.send('app-wxr-imported', data);
                }
            } else if (!completed) {
                sender.send('app-wxr-import-progress', data);
            }
        });
        importProcess.on('error', error => sendFailure(error.message || 'Unable to start the WordPress importer.'));
        importProcess.on('exit', code => {
            if (!completed) {
                sendFailure(code === 0 ? 'The WordPress importer returned no result.' : 'The WordPress importer stopped unexpectedly.');
            }
        });

        importProcess.send({
            type: 'dependencies',
            appInstance: {
                appDir: appInstance.appDir,
                appConfig: appInstance.appConfig,
                sitesDir: appInstance.sitesDir,
                sites: appInstance.sites
            },
            siteName: config.siteName,
            filePath: config.filePath,
            importAuthors: config.importAuthors,
            usedTaxonomy: config.usedTaxonomy,
            slugStrategy: config.slugStrategy,
            seoProvider: config.seoProvider || 'auto',
            autop: config.autop,
            importMenus: config.importMenus,
            postTypes: config.postTypes
        });
    }
}

module.exports = ImportEvents;
