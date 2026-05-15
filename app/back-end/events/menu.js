const fs = require('fs-extra');
const path = require('path');
const ipcMain = require('electron').ipcMain;
const PathValidator = require('../helpers/path-validator.js');

const { isValidDirSegment, resolveValidPath } = PathValidator;

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
            if (!data || !isValidDirSegment(data.siteName)) {
                event.sender.send('app-menu-updated', false);
                return;
            }

            let saved = self.saveNewMenuStructure(data.menuStructure, data.siteName);
            event.sender.send('app-menu-updated', saved);
        });
    }

    saveNewMenuStructure(menuStructure, siteName) {
        let menuFile = resolveValidPath(this.app.sitesDir, siteName, 'input', 'config', 'menu.config.json');

        if (!menuFile) {
            return false;
        }

        fs.writeFileSync(menuFile, JSON.stringify(menuStructure, null, 4), { encoding: 'utf8' });
        return true;
    }
}

module.exports = MenuEvents;
