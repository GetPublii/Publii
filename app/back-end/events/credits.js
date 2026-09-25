const fs = require('fs-extra');
const path = require('path');
const { ipcMain, shell } = require('electron');
const FileHelper = require('../helpers/file.js');
const PathValidator = require('../helpers/path-validator.js');

const { resolveValidPath } = PathValidator;
const appDir = path.resolve(__dirname, '../../');

/*
 * Resolves a license path relative to the app directory,
 * returns null for invalid paths and paths outside the app directory
 */
function resolveLicensePath (licenseUrl) {
    if (typeof licenseUrl !== 'string' ||
        licenseUrl.length === 0 ||
        licenseUrl.indexOf('\0') !== -1) {
        return null;
    }

    let relativeUrl = licenseUrl.replace(/^[/\\]+/, '');
    let segments = relativeUrl.split(/[/\\]+/).filter(s => s.length > 0);

    if (segments.length === 0 || segments.some(s => s === '..' || s === '.')) {
        return null;
    }

    return resolveValidPath(appDir, ...segments);
}

/*
 * Events for the IPC communication regarding credits
 */

class CreditsEvents {
    constructor(appInstance) {
        /*
         * Load license text
         */
        ipcMain.handle('app-credits-list:load-license', function(event, licenseUrl) {
            let filePath = resolveLicensePath(licenseUrl);

            if (filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
                return FileHelper.readFileSync(filePath, 'utf-8');
            }

            return {
                translation: 'core.credits.errorLoadingLicenseMsg'
            };
        });

        /*
         * Open a HTML license file which is too big to display in the app
         * (e.g. LICENSES.chromium.html) in the default browser. The file
         * has to be unpacked from app.asar - see build.asarUnpack in package.json
         */
        ipcMain.handle('app-credits-list:open-license', async function(event, licenseUrl) {
            let filePath = resolveLicensePath(licenseUrl);
            let licensesDir = path.join(appDir, 'licenses') + path.sep;

            if (!filePath ||
                !filePath.startsWith(licensesDir) ||
                path.extname(filePath).toLowerCase() !== '.html') {
                return false;
            }

            let unpackedPath = filePath.replace('app.asar', 'app.asar.unpacked');

            if (!fs.existsSync(unpackedPath) || !fs.statSync(unpackedPath).isFile()) {
                return false;
            }

            return await shell.openPath(unpackedPath) === '';
        });
    }
}

module.exports = CreditsEvents;
