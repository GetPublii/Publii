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
            let platform;
            
            if (process.platform === 'darwin') {
                platform = process.arch === 'arm64' ? 'mac-arm64' : 'mac-x86';
            } else if (process.platform === 'win32') {
                platform = 'win';
            } else {
                platform = 'linux';
            }

            let updatesHelper = new UpdatesHelper({
                event: event,
                filePath: path.join(appInstance.app.getPath('logs'), 'updates.json'),
                url: 'https://notifications.getpublii.com/updates-' + platform + '.json',
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
