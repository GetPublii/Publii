const ipcMain = require('electron').ipcMain;
const fs = require('fs');
const path = require('path');

/*
 * Events for the IPC communication regarding plugins
 */

class PluginsApiEvents {
    constructor (appInstance) {
        // Read file in site
        ipcMain.handle('app-plugins-api:read-file', function (event, data) {
            let fileName = data.fileName.replace(/a-zA-Z0-9\-\_\.\*\@\+/gmi, '');
            let siteName = data.siteName.replace(/[\/\\]/gmi, '');
            let pluginName = data.pluginName.replace(/[\/\\]/gmi, '');
            let filePath = path.join(appInstance.sitesDir, siteName, 'input', 'config', 'plugins', pluginName, fileName);

            if (!fs.existsSync(filePath)) {
                event.sender.send('app-plugins-api:file-readed', false);  
                return;  
            }

            let fileContent = fs.readFileSync(filePath);
            fileContent = fileContent.toString();
            return fileContent;
        });

        // Save file in site
        ipcMain.handle('app-plugins-api:save-file', function (event, data) {
            let fileName = data.fileName.replace(/a-zA-Z0-9\-\_\.\*\@\+/gmi, '');
            let siteName = data.siteName.replace(/[\/\\]/gmi, '');
            let pluginName = data.pluginName.replace(/[\/\\]/gmi, '');
            let filePath = path.join(appInstance.sitesDir, siteName, 'input', 'config', 'plugins', pluginName, fileName);
           
            if (!fs.existsSync(path.join(appInstance.sitesDir, siteName, 'input', 'config', 'plugins', pluginName))) {
                fs.mkdirSync(path.join(appInstance.sitesDir, siteName, 'input', 'config', 'plugins', pluginName));
            }

            try {
                fs.writeFileSync(filePath, data.fileContent);
                return { status: 'FILE_SAVED' };
            } catch (e) {
                return { status: 'FILE_NOT_SAVED' };
            }
        });

        // Delete file in site
        ipcMain.handle('app-plugins-api:delete-file', function (event, data) {
            let fileName = data.fileName.replace(/a-zA-Z0-9\-\_\.\*\@\+/gmi, '');
            let siteName = data.siteName.replace(/[\/\\]/gmi, '');
            let pluginName = data.pluginName.replace(/[\/\\]/gmi, '');
            let filePath = path.join(appInstance.sitesDir, siteName, 'input', 'config', 'plugins', pluginName, fileName);
           
            if (!fs.existsSync(filePath)) {  
                return { status: 'FILE_TO_REMOVE_NOT_EXISTS' };
            }

            try {
                fs.unlinkSync(filePath);
                return { status: 'FILE_REMOVED' };
            } catch (e) {
                return { status: 'FILE_NOT_REMOVED' };
            }
        });
    }
}

module.exports = PluginsApiEvents;
