const fs = require('fs-extra');
const path = require('path');
const FileHelper = require('../helpers/file.js');
const ipcMain = require('electron').ipcMain;
const PathValidator = require('../helpers/path-validator.js');

const { isValidDirSegment, resolveValidPath } = PathValidator;

/*
 * Events for the IPC communication regarding sync events
 */

class SyncEvents {
    constructor(appInstance) {
        let self = this;
        this.app = appInstance;

        /*
         * Save information about site that there are no
         * operations to sync
         */
        ipcMain.on('app-sync-is-done', function (event, config) {
            if (!config || !isValidDirSegment(config.site)) {
                event.sender.send('app-sync-is-done-saved', false);
                return;
            }

            let saved = self.saveSyncStatus('synced', config.site);
            event.sender.send('app-sync-is-done-saved', saved);
        });
    }

    saveSyncStatus(status, siteName) {
        let configFile = resolveValidPath(this.app.sitesDir, siteName, 'input', 'config', 'site.config.json');

        if (!configFile) {
            return false;
        }

        let configContent = FileHelper.readFileSync(configFile, 'utf8');
        configContent = JSON.parse(configContent);
        configContent.synced = status;

        if(status === 'synced') {
            configContent.syncDate = Date.now();
        }

        fs.writeFileSync(configFile, JSON.stringify(configContent, null, 4));
        return true;
    }
}

module.exports = SyncEvents;
