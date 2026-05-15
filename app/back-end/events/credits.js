const fs = require('fs-extra');
const path = require('path');
const ipcMain = require('electron').ipcMain;
const FileHelper = require('../helpers/file.js');
const PathValidator = require('../helpers/path-validator.js');

const { resolveValidPath } = PathValidator;

/*
 * Events for the IPC communication regarding credits
 */

class CreditsEvents {
    constructor(appInstance) {
        /*
         * Load license text
         */
        ipcMain.on('app-license-load', function(event, config) {
            let errorResponse = {
                translation: 'core.credits.errorLoadingLicenseMsg'
            };

            if (!config ||
                typeof config.url !== 'string' ||
                config.url.length === 0 ||
                config.url.indexOf('\0') !== -1) {
                event.sender.send('app-license-loaded', errorResponse);
                return;
            }

            let relativeUrl = config.url.replace(/^[/\\]+/, '');
            let segments = relativeUrl.split(/[/\\]+/).filter(s => s.length > 0);

            if (segments.length === 0 || segments.some(s => s === '..' || s === '.')) {
                event.sender.send('app-license-loaded', errorResponse);
                return;
            }

            let baseDir = path.resolve(__dirname, '../../');
            let filePath = resolveValidPath(baseDir, ...segments);
            let licenseText = errorResponse;

            if (filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
                licenseText = FileHelper.readFileSync(filePath, 'utf-8');
            }

            event.sender.send('app-license-loaded', licenseText);
        });
    }
}

module.exports = CreditsEvents;
