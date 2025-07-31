const ipcMain = require('electron').ipcMain;
const path = require('path');
const UpdatesHelper = require('../helpers/updates.helper.js');

/*
 * Events for the IPC communication regarding notifications
 */

class NotificationsEvents {
    constructor(appInstance) {
        // Save
        ipcMain.on('app-notifications-retrieve', function(event, downloadNotifications) {
            let updatesHelper = new UpdatesHelper({
                event: event,
                filePath: path.join(appInstance.app.getPath('logs'), 'all.json'),
                url: 'https://notifications.dkonto.pl/all.json',
                forceDownload: downloadNotifications
            });

            updatesHelper.retrieve();
        });

        // Get notifications file
        ipcMain.handle('app-get-notifications-file', async (event, fileName) => {
            let filePath = path.join(appInstance.app.getPath('logs'), fileName);

            try {
                let data = await appInstance.app.readFile(filePath, 'utf8');
                return JSON.parse(data);
            } catch (error) {
                console.error(`Error reading notifications file: ${error.message}`);
                return false;
            }
        });
    }
}

module.exports = NotificationsEvents;
