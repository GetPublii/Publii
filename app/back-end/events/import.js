const fs = require('fs-extra');
const path = require('path');
const ipcMain = require('electron').ipcMain;
const Import = require('../modules/import/import.js');
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

        /*
         * Import WXR file
         */
        ipcMain.on('app-wxr-check', function(event, config) {
            if (!self.validateImportInput(config)) {
                event.sender.send('app-wxr-checked', {
                    status: 'error',
                    message: 'Invalid import parameters'
                });
                return;
            }

            self.checkFile(config.siteName, config.filePath, event.sender);
        });

        ipcMain.on('app-wxr-import', function(event, config) {
            if (!self.validateImportInput(config)) {
                event.sender.send('app-wxr-imported', {
                    type: 'result',
                    status: 'error',
                    message: 'Invalid import parameters'
                });
                return;
            }

            self.importFile(appInstance, config, event.sender);
        });
    }

    /**
     * Validates siteName and filePath supplied from the renderer.
     */
    validateImportInput(config) {
        if (!config || typeof config !== 'object') {
            return false;
        }

        if (!isValidDirSegment(config.siteName)) {
            return false;
        }

        let sitePath = path.join(this.app.sitesDir, config.siteName);

        try {
            if (!fs.existsSync(sitePath) || !fs.statSync(sitePath).isDirectory()) {
                return false;
            }
        } catch (e) {
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

        return true;
    }

    /**
     * Checking the WXR file
     *
     * @param siteName
     * @param filePath
     */
    checkFile(siteName, filePath, sender) {
        let importProcess = childProcess.fork(__dirname + '/../workers/import/check', {
            stdio: [
                null,
                fs.openSync(this.app.app.getPath('logs') + "/import-check-process.log", "w"),
                fs.openSync(this.app.app.getPath('logs') + "/import-check-errors.log", "w"),
                'ipc'
            ]
        });

        importProcess.send({
            type: 'dependencies',
            siteName: siteName,
            filePath: filePath
        });

        importProcess.on('message', function(data) {
            sender.send('app-wxr-checked', data);
        });
    }

    /**
     * Imports data from the WXR file
     *
     * @param appInstance
     * @param config
     */
    importFile(appInstance, config, sender) {
        let importProcess = childProcess.fork(__dirname + '/../workers/import/import', {
            stdio: [
                null,
                fs.openSync(this.app.app.getPath('logs') + "/import-process.log", "w"),
                fs.openSync(this.app.app.getPath('logs') + "/import-errors.log", "w"),
                'ipc'
            ]
        });

        importProcess.send({
            type: 'dependencies',
            appInstance: {
                appDir: appInstance.appDir,
                sitesDir: appInstance.sitesDir,
                sites: appInstance.sites
            },
            siteName: config.siteName,
            filePath: config.filePath,
            importAuthors: config.importAuthors,
            usedTaxonomy: config.usedTaxonomy,
            autop: config.autop,
            postTypes: config.postTypes
        });

        importProcess.on('message', function(data) {
            if(data.type === 'result') {
                sender.send('app-wxr-imported', data);
            } else {
                sender.send('app-wxr-import-progress', data);
            }
        });
    }
}

module.exports = ImportEvents;
