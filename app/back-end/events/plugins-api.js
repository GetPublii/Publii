const ipcMain = require('electron').ipcMain;
const fs = require('fs');
const path = require('path');

/*
 * Events for the IPC communication regarding plugins
 */

class PluginsApiEvents {
    constructor (appInstance) {
        // Read file in site
        ipcMain.handle('app-plugins-api:read-config-file', function (event, data) {
            let fileName = data.fileName.replace(/a-zA-Z0-9\-\_\.\*\@\+/gmi, '');
            let siteName = data.siteName.replace(/[\/\\]/gmi, '');
            let pluginName = data.pluginName.replace(/[\/\\]/gmi, '');
            let filePath = path.join(appInstance.sitesDir, siteName, 'input', 'config', 'plugins', pluginName, fileName);

            if (!fs.existsSync(filePath)) {
                return false;  
            }

            let fileContent = fs.readFileSync(filePath);
            fileContent = fileContent.toString();
            return fileContent;
        });

        // Read file in the languages
        ipcMain.handle('app-plugins-api:read-language-file', function (event, data) {
            let fileName = data.fileName.replace(/a-zA-Z0-9\-\_\.\*\@\+/gmi, '');
            let siteName = data.siteName.replace(/[\/\\]/gmi, '');
            let filePath = path.join(appInstance.sitesDir, siteName, 'input', 'languages', fileName);

            if (!fs.existsSync(filePath)) { 
                return false;
            }

            let fileContent = fs.readFileSync(filePath);
            fileContent = fileContent.toString();
            return fileContent;
        });

        // Read file in the themes
        ipcMain.handle('app-plugins-api:read-theme-file', function (event, data) {
            let fileName = data.fileName.replace(/a-zA-Z0-9\-\_\.\*\@\+/gmi, '');
            let themeName = data.themeName.replace(/a-zA-Z0-9\-\_\.\*\@\+/gmi, '');
            let siteName = data.siteName.replace(/[\/\\]/gmi, '');
            let filePath = path.join(appInstance.sitesDir, siteName, 'input', 'themes', themeName, fileName);

            if (!fs.existsSync(filePath)) {
                return false;  
            }

            let fileContent = fs.readFileSync(filePath);
            fileContent = fileContent.toString();
            return fileContent;
        });

        // Save file in site
        ipcMain.handle('app-plugins-api:save-config-file', function (event, data) {
            let fileName = data.fileName.replace(/a-zA-Z0-9\-\_\.\*\@\+/gmi, '');
            let siteName = data.siteName.replace(/[\/\\]/gmi, '');
            let pluginName = data.pluginName.replace(/[\/\\]/gmi, '');
            let filePath = path.join(appInstance.sitesDir, siteName, 'input', 'config', 'plugins', pluginName, fileName);
           
            if (!fs.existsSync(path.join(appInstance.sitesDir, siteName, 'input', 'config', 'plugins', pluginName))) {
                fs.mkdirSync(path.join(appInstance.sitesDir, siteName, 'input', 'config', 'plugins', pluginName), { recursive: true });
            }

            try {
                fs.writeFileSync(filePath, data.fileContent);
                return { status: 'FILE_SAVED' };
            } catch (e) {
                return { status: 'FILE_NOT_SAVED' };
            }
        });

        // Save file in languages
        ipcMain.handle('app-plugins-api:save-language-file', function (event, data) {
            let fileName = data.fileName.replace(/a-zA-Z0-9\-\_\.\*\@\+/gmi, '');
            let siteName = data.siteName.replace(/[\/\\]/gmi, '');
            let dirPath = path.join(appInstance.sitesDir, siteName, 'input', 'languages');
            let filePath = path.join(appInstance.sitesDir, siteName, 'input', 'languages', fileName);

            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }

            try {
                fs.writeFileSync(filePath, data.fileContent);
                return { status: 'FILE_SAVED' };
            } catch (e) {
                return { status: 'FILE_NOT_SAVED' };
            }
        });

        // Delete file in site
        ipcMain.handle('app-plugins-api:delete-config-file', function (event, data) {
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

        // Delete file in site
        ipcMain.handle('app-plugins-api:delete-language-file', function (event, data) {
            let fileName = data.fileName.replace(/a-zA-Z0-9\-\_\.\*\@\+/gmi, '');
            let siteName = data.siteName.replace(/[\/\\]/gmi, '');
            let filePath = path.join(appInstance.sitesDir, siteName, 'input', 'languages', fileName);
           
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
