const ipcMain = require('electron').ipcMain;
const fs = require('fs');
const path = require('path');
const FileHelper = require('../helpers/file.js');
const PathValidator = require('../helpers/path-validator.js');

/*
 * Events for the IPC communication regarding plugins
 */

const { isValidDirSegment, isValidFileName, resolveValidPath } = PathValidator;

class PluginsApiEvents {
    constructor (appInstance) {
        // Read file in site
        ipcMain.handle('app-plugins-api:read-config-file', function (event, data) {
            if (
                !isValidDirSegment(data.siteName) ||
                !isValidDirSegment(data.pluginName) ||
                !isValidFileName(data.fileName)
            ) {
                return false;
            }

            let baseDir = path.join(appInstance.sitesDir, data.siteName, 'input', 'config', 'plugins', data.pluginName);
            let filePath = resolveValidPath(baseDir, data.fileName);

            if (!filePath || !fs.existsSync(filePath)) {
                return false;
            }

            let fileContent = FileHelper.readFileSync(filePath);
            fileContent = fileContent.toString();
            return fileContent;
        });

        // Read file in the languages
        ipcMain.handle('app-plugins-api:read-language-file', function (event, data) {
            if (
                !isValidDirSegment(data.siteName) ||
                !isValidFileName(data.fileName)
            ) {
                return false;
            }

            let baseDir = path.join(appInstance.sitesDir, data.siteName, 'input', 'languages');
            let filePath = resolveValidPath(baseDir, data.fileName);

            if (!filePath || !fs.existsSync(filePath)) {
                return false;
            }

            let fileContent = FileHelper.readFileSync(filePath);
            fileContent = fileContent.toString();
            return fileContent;
        });

        // Read file in the themes
        ipcMain.handle('app-plugins-api:read-theme-file', function (event, data) {
            if (
                !isValidDirSegment(data.siteName) ||
                !isValidDirSegment(data.themeName) ||
                !isValidFileName(data.fileName)
            ) {
                return false;
            }

            let baseDir = path.join(appInstance.sitesDir, data.siteName, 'input', 'themes', data.themeName);
            let filePath = resolveValidPath(baseDir, data.fileName);

            if (!filePath || !fs.existsSync(filePath)) {
                return false;
            }

            let fileContent = FileHelper.readFileSync(filePath);
            fileContent = fileContent.toString();
            return fileContent;
        });

        // Save file in site
        ipcMain.handle('app-plugins-api:save-config-file', function (event, data) {
            if (
                !isValidDirSegment(data.siteName) ||
                !isValidDirSegment(data.pluginName) ||
                !isValidFileName(data.fileName)
            ) {
                return { status: 'FILE_NOT_SAVED' };
            }

            let pluginDir = path.join(appInstance.sitesDir, data.siteName, 'input', 'config', 'plugins', data.pluginName);
            let filePath = resolveValidPath(pluginDir, data.fileName);

            if (!filePath) {
                return { status: 'FILE_NOT_SAVED' };
            }

            if (!fs.existsSync(pluginDir)) {
                fs.mkdirSync(pluginDir, { recursive: true });
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
            if (
                !isValidDirSegment(data.siteName) ||
                !isValidFileName(data.fileName)
            ) {
                return { status: 'FILE_NOT_SAVED' };
            }

            // Language files are JSON by convention.
            if (path.extname(data.fileName).toLowerCase() !== '.json') {
                return { status: 'FILE_NOT_SAVED' };
            }

            let dirPath = path.join(appInstance.sitesDir, data.siteName, 'input', 'languages');
            let filePath = resolveValidPath(dirPath, data.fileName);

            if (!filePath) {
                return { status: 'FILE_NOT_SAVED' };
            }

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
            if (
                !isValidDirSegment(data.siteName) ||
                !isValidDirSegment(data.pluginName) ||
                !isValidFileName(data.fileName)
            ) {
                return { status: 'FILE_NOT_REMOVED' };
            }

            let baseDir = path.join(appInstance.sitesDir, data.siteName, 'input', 'config', 'plugins', data.pluginName);
            let filePath = resolveValidPath(baseDir, data.fileName);

            if (!filePath || !fs.existsSync(filePath)) {
                return { status: 'FILE_TO_REMOVE_NOT_EXISTS' };
            }

            try {
                fs.unlinkSync(filePath);
                return { status: 'FILE_REMOVED' };
            } catch (e) {
                return { status: 'FILE_NOT_REMOVED' };
            }
        });

        // Delete file in languages
        ipcMain.handle('app-plugins-api:delete-language-file', function (event, data) {
            if (
                !isValidDirSegment(data.siteName) ||
                !isValidFileName(data.fileName)
            ) {
                return { status: 'FILE_NOT_REMOVED' };
            }

            let baseDir = path.join(appInstance.sitesDir, data.siteName, 'input', 'languages');
            let filePath = resolveValidPath(baseDir, data.fileName);

            if (!filePath || !fs.existsSync(filePath)) {
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
