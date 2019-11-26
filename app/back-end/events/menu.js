const fs = require('fs-extra');
const path = require('path');
const ipcMain = require('electron').ipcMain;

/*
 * Events for the IPC communication regarding menu events
 */

class MenuEvents {
    constructor(appInstance) {
        let self = this;
        this.app = appInstance;

        /*
         * Save information about menu
         */
        ipcMain.on('app-menu-update', function (event, data) {
            self.saveNewMenuStructure(data.menuStructure, data.siteName);
            event.sender.send('app-menu-updated', true);
        });
    }

    saveNewMenuStructure(menuStructure, siteName) {
        let menuFile = path.join(this.app.sitesDir, siteName, 'input', 'config', 'menu.config.json');
        fs.writeFileSync(menuFile, JSON.stringify(menuStructure, null, 4), { encoding: 'utf8' });
    }
}

module.exports = MenuEvents;
