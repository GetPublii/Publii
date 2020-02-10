const fs = require('fs-extra');
const path = require('path');
const ipcMain = require('electron').ipcMain;
const Import = require('../modules/import/import.js');
const childProcess = require('child_process');

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
            self.checkFile(config.siteName, config.filePath, event.sender);
        });

        ipcMain.on('app-wxr-import', function(event, config) {
            self.importFile(appInstance, config, event.sender);
        });
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
