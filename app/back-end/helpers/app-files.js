const fs = require('fs-extra');
const path = require('path');
const Utils = require('./utils.js');

/**
 * Helper class used to manage app-related files
 */
class AppFilesHelper {
    /**
     * Constructor of the helper
     *
     * @param appInstance
     */
    constructor(appInstance) {
        this.application = appInstance;
    }

    /**
     * Relocate all sites from old to new location
     *
     * @param oldLocation
     * @param newLocation
     * @param event
     * @returns {boolean}
     */
    relocateSites(oldLocation, newLocation, event) {
        if(!Utils.dirExists(oldLocation) || !Utils.dirExists(newLocation)) {
            event.sender.send('app-config-saved', {
                status: false,
                message: 'error-save'
            });

            return false;
        }

        let sitesToMove = fs.readdirSync(oldLocation);
        let copyErrorOccurred = false;
        let catalogsToRemove = [];

        for(let site of sitesToMove) {
            let result = this.relocateSite(oldLocation, newLocation, site);

            if(result === false) {
                copyErrorOccurred = true;
                break;
            }

            if(result !== '') {
                catalogsToRemove.push(result);
            }
        }


        if(copyErrorOccurred) {
            fs.emptyDirSync(newLocation);

            event.sender.send('app-config-saved', {
                status: false,
                message: 'error-save'
            });

            return false;
        }

        this.removeCatalogs(oldLocation, catalogsToRemove);
        this.application.sitesDir = newLocation;
        this.application.app.sitesDir = newLocation;

        return true;
    }

    /**
     * Moves specific site files from old to a new location
     *
     * @param oldLocation
     * @param newLocation
     * @param site
     * @returns {boolean|string} - false on error, string with site directory name otherwise
     */
    relocateSite(oldLocation, newLocation, site) {
        let siteLocation = path.join(oldLocation, site);

        // Checks only for existing directories with Publii website
        if(!Utils.dirExists(siteLocation) || !this.checkIfDirectoryIsSite(siteLocation)) {
            return '';
        }

        try {
            fs.mkdirSync(path.join(newLocation, site), { recursive: true });

            fs.copySync(
                path.join(oldLocation, site),
                path.join(newLocation, site),
                {
                    overwrite: true,
                    preserveTimestamps: true
                }
            );
        } catch(e) {
            console.log('ERROR OCCURRED: ' + site, e);
            return false;
        }

        return site;
    }

    /**
     * Check if specific directory is a Publii website catalog
     *
     * @param siteLocation
     */
    checkIfDirectoryIsSite(siteLocation) {
        let inputDirPath = path.join(siteLocation, 'input');
        let databasePath = path.join(inputDirPath, 'db.sqlite');
        let inputDirExists = Utils.dirExists(inputDirPath);
        let databaseExists = Utils.fileExists(databasePath);

        return inputDirExists && databaseExists;
    }

    /**
     * Removes specific catalogs
     * removing all catalogs
     *
     * @param catalogsToRemove
     */
    removeCatalogs(location, catalogsToRemove) {
        for(let catalogToRemove of catalogsToRemove) {
            let catalogPath = path.join(location, catalogToRemove);
            fs.removeSync(catalogPath);
        }
    }
}

module.exports = AppFilesHelper;
