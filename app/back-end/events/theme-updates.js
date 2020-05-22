const ipcMain = require('electron').ipcMain;
const path = require('path');
const UpdatesHelper = require('../helpers/updates.helper.js');

/*
 * Events for the IPC communication regarding theme updates
 */

class ThemeUpdatesEvents {
    constructor(appInstance) {
        // Save
        ipcMain.on('app-theme-updates-retrieve', function(event, downloadNotifications) {
            let updatesHelper = new UpdatesHelper({
                event: event,
                filePath: path.join(appInstance.app.getPath('logs'), 'theme-updates.json'),
                namespace: 'theme-updates',
                url: 'https://getpublii.com/theme-updates.json',
                contentField: 'updates',
                forceDownload: downloadNotifications
            });

            updatesHelper.retrieve();
        });
    }
}

module.exports = ThemeUpdatesEvents;
