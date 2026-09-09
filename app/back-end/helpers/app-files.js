const fs = require('fs-extra');
const path = require('path');
const Utils = require('./utils.js');

/**
 * Helper class used to manage app-related files.
 */
class AppFilesHelper {
    constructor(appInstance) {
        this.application = appInstance;
    }

    /**
     * Copy all sites, persist the new location, then remove the originals.
     * Before persistence succeeds, rollback only directories created here.
     */
    relocateSites(oldLocation, newLocation, saveConfig) {
        let createdDirectories = [];
        let sitesToMove;

        try {
            if (!Utils.dirExists(oldLocation) || !Utils.dirExists(newLocation)) {
                return false;
            }

            const oldPath = fs.realpathSync(oldLocation);
            const newPath = fs.realpathSync(newLocation);

            if (this.pathsOverlap(oldPath, newPath)) {
                return false;
            }

            sitesToMove = fs.readdirSync(oldPath).filter(site => {
                const sitePath = path.join(oldPath, site);
                return Utils.dirExists(sitePath) && this.checkIfDirectoryIsSite(sitePath);
            });

            // Refuse every collision before starting to copy any website.
            for (const site of sitesToMove) {
                if (fs.lstatSync(path.join(oldPath, site)).isSymbolicLink()) {
                    throw new Error('Cannot relocate a symbolic link to a website: ' + site);
                }

                try {
                    fs.lstatSync(path.join(newPath, site));
                } catch (error) {
                    if (error.code === 'ENOENT') {
                        continue;
                    }

                    throw error;
                }

                throw new Error('Website destination already exists: ' + site);
            }

            for (const site of sitesToMove) {
                const destination = path.join(newPath, site);

                // Exclusive creation also catches conflicts introduced after preflight.
                fs.mkdirSync(destination);
                createdDirectories.push(destination);
                fs.copySync(path.join(oldPath, site), destination, {
                    overwrite: false,
                    errorOnExist: true,
                    preserveTimestamps: true
                });
            }

            saveConfig();
        } catch (error) {
            console.log('Unable to relocate websites:', error);
            this.removeDirectories(createdDirectories);
            return false;
        }

        this.application.sitesDir = newLocation;
        this.application.app.sitesDir = newLocation;

        // The new location is complete and persisted. A cleanup failure must never
        // roll it back: some originals may already have been removed.
        this.removeDirectories(sitesToMove.map(site => path.join(oldLocation, site)));
        return true;
    }

    pathsOverlap(first, second) {
        const contains = (parent, child) => {
            const relative = path.relative(parent, child);
            return relative === '' || (
                relative !== '..' &&
                !relative.startsWith('..' + path.sep) &&
                !path.isAbsolute(relative)
            );
        };

        return contains(first, second) || contains(second, first);
    }

    /**
     * Replace the settings file only after the complete new file was written.
     */
    saveConfig(config) {
        const configPath = this.application.appConfigPath;
        const temporaryDirectory = fs.mkdtempSync(path.join(path.dirname(configPath), '.publii-config-'));

        try {
            const temporaryPath = path.join(temporaryDirectory, 'app-config.json');
            fs.writeFileSync(temporaryPath, JSON.stringify(config, null, 4));
            fs.renameSync(temporaryPath, configPath);
        } finally {
            this.removeDirectories([temporaryDirectory]);
        }
    }

    checkIfDirectoryIsSite(siteLocation) {
        const inputDirPath = path.join(siteLocation, 'input');
        const databasePath = path.join(inputDirPath, 'db.sqlite');
        return Utils.dirExists(inputDirPath) && Utils.fileExists(databasePath);
    }

    removeDirectories(directories) {
        for (const directory of directories) {
            try {
                Utils.removePathRecursively(directory);
            } catch (error) {
                // Leave a residual copy when cleanup fails; never delete other data.
                console.log('Unable to remove relocation directory: ' + directory, error);
            }
        }
    }
}

module.exports = AppFilesHelper;
