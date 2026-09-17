/*
 * Logs of a website are stored in its own directory: <logs>/sites/<website UUID>/
 *
 * The UUID survives renaming of the website. Websites created before UUIDs were introduced
 * do not have one, so they are identified by the name of their directory.
 * Logs which do not belong to any website stay directly in the logs directory.
 */

const fs = require('fs-extra');
const path = require('path');
const PathValidator = require('./path-validator.js');

const SITES_LOGS_DIRECTORY = 'sites';

// Worker logs which always belong to a website. Files with these names found directly in the logs
// directory were created by older versions of the app and are not listed among the general logs.
const SITE_WORKER_LOGS = ['rendering', 'rendering-deployment', 'deployment', 'regenerate', 'import'];
const SITE_REPORT_FILES = ['import-report-wordpress.log'];

class SiteLogs {
    static isLogFile (fileName) {
        return typeof fileName === 'string' && (fileName.substr(-4) === '.txt' || fileName.substr(-4) === '.log');
    }

    static isSiteLogFileName (fileName) {
        if (SITE_REPORT_FILES.indexOf(fileName) > -1) {
            return true;
        }

        return SITE_WORKER_LOGS.some(logName => fileName === logName + '-process.log' || fileName === logName + '-errors.log');
    }

    /**
     * Returns the name of the logs directory of the website or null for an unknown website
     */
    static getKey (appInstance, siteName) {
        if (!PathValidator.isValidDirSegment(siteName) ||
            !appInstance.sites ||
            !Object.prototype.hasOwnProperty.call(appInstance.sites, siteName)) {
            return null;
        }

        let uuid = appInstance.sites[siteName].uuid;

        if (typeof uuid === 'string' && PathValidator.isValidDirSegment(uuid)) {
            return uuid;
        }

        return siteName;
    }

    static getRootDirectory (appInstance) {
        return appInstance.app.getPath('logs');
    }

    /**
     * Returns the logs directory of the website or null for an unknown website
     */
    static getDirectory (appInstance, siteName, create = true) {
        let key = SiteLogs.getKey(appInstance, siteName);

        if (!key) {
            return null;
        }

        let directory = path.join(SiteLogs.getRootDirectory(appInstance), SITES_LOGS_DIRECTORY, key);

        if (create) {
            fs.ensureDirSync(directory);
        }

        return directory;
    }

    /**
     * Directory for the logs of a worker: the one of the website or - for an unknown website - the general one
     */
    static getWorkerLogsDirectory (appInstance, siteName) {
        return SiteLogs.getDirectory(appInstance, siteName) || SiteLogs.getRootDirectory(appInstance);
    }

    static isSymbolicLink (targetPath) {
        try {
            return fs.lstatSync(targetPath).isSymbolicLink();
        } catch (error) {
            return false;
        }
    }

    static listDirectory (directory, allowLinkedDirectory = false) {
        if (!directory || !fs.existsSync(directory)) {
            return [];
        }

        if (!allowLinkedDirectory && SiteLogs.isSymbolicLink(directory)) {
            return [];
        }

        return fs.readdirSync(directory).filter(fileName => {
            if (!SiteLogs.isLogFile(fileName)) {
                return false;
            }

            try {
                return fs.lstatSync(path.join(directory, fileName)).isFile();
            } catch (error) {
                return false;
            }
        }).sort();
    }

    /**
     * Returns logs of the website and the general logs of the app
     */
    static list (appInstance, siteName) {
        let siteFiles = SiteLogs.listDirectory(SiteLogs.getDirectory(appInstance, siteName, false));
        let appFiles = SiteLogs.listDirectory(SiteLogs.getRootDirectory(appInstance), true).filter(fileName => {
            return !SiteLogs.isSiteLogFileName(fileName) && siteFiles.indexOf(fileName) === -1;
        });

        return {
            site: siteFiles,
            app: appFiles
        };
    }

    /**
     * Returns the path of a listed log file or null - only files returned by list() can be read
     */
    static resolveFile (appInstance, siteName, fileName) {
        if (!PathValidator.isValidFileName(fileName)) {
            return null;
        }

        let logs = SiteLogs.list(appInstance, siteName);

        if (logs.site.indexOf(fileName) > -1) {
            return path.join(SiteLogs.getDirectory(appInstance, siteName, false), fileName);
        }

        if (logs.app.indexOf(fileName) > -1) {
            return path.join(SiteLogs.getRootDirectory(appInstance), fileName);
        }

        return null;
    }

    /**
     * Removes logs of a deleted website - has to be called while the website is still on the sites list
     */
    static remove (appInstance, siteName) {
        let directory = SiteLogs.getDirectory(appInstance, siteName, false);

        if (directory && fs.existsSync(directory)) {
            fs.removeSync(directory);
        }
    }

    /**
     * Keeps logs of a renamed website which has no UUID - its logs directory uses the name of the website
     */
    static rename (appInstance, oldSiteName, newSiteName, uuid) {
        if (typeof uuid === 'string' && PathValidator.isValidDirSegment(uuid)) {
            return;
        }

        if (!PathValidator.isValidDirSegment(oldSiteName) || !PathValidator.isValidDirSegment(newSiteName)) {
            return;
        }

        let sitesLogsDirectory = path.join(SiteLogs.getRootDirectory(appInstance), SITES_LOGS_DIRECTORY);
        let oldDirectory = path.join(sitesLogsDirectory, oldSiteName);
        let newDirectory = path.join(sitesLogsDirectory, newSiteName);

        if (fs.existsSync(oldDirectory) && !fs.existsSync(newDirectory)) {
            fs.renameSync(oldDirectory, newDirectory);
        }
    }
}

module.exports = SiteLogs;
