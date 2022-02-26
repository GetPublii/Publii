const fs = require('fs-extra');
const path = require('path');
const ipcMain = require('electron').ipcMain;

/*
 * Events for the IPC communication regarding credits
 */

class CreditsEvents {
    constructor(appInstance) {
        /*
         * Load license text
         */
        ipcMain.on('app-license-load', function(event, config) {
            let filePath = path.join(__dirname, '../../', config.url);
            let licenseText = {
                translation: 'core.credits.errorLoadingLicenseMsg'
            }

            if(fs.existsSync(filePath)) {
                licenseText = fs.readFileSync(filePath, 'utf-8');
            }

            event.sender.send('app-license-loaded', licenseText);
        });
    }
}

module.exports = CreditsEvents;
