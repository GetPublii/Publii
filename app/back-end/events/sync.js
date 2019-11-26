const fs = require('fs-extra');
const path = require('path');
const ipcMain = require('electron').ipcMain;

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
            self.saveSyncStatus('synced', config.site);
            event.sender.send('app-sync-is-done-saved', true);
        });
    }

    saveSyncStatus(status, siteName) {
        let configFile = path.join(this.app.sitesDir, siteName, 'input', 'config', 'site.config.json');
        let configContent = fs.readFileSync(configFile, 'utf8');
        configContent = JSON.parse(configContent);
        configContent.synced = status;

        if(status === 'synced') {
            configContent.syncDate = Date.now();
        }

        fs.writeFileSync(configFile, JSON.stringify(configContent, null, 4));
    }
}

module.exports = SyncEvents;
