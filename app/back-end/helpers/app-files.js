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
     * The reason and detail describe a refusal in terms the UI can present.
     */
    relocateSites(oldLocation, newLocation, saveConfig) {
        let createdDirectories = [];
        let sitesToMove;

        try {
            if (!Utils.dirExists(oldLocation) || !Utils.dirExists(newLocation)) {
                return { status: false, reason: 'location-missing' };
            }

            const oldPath = fs.realpathSync(oldLocation);
            const newPath = fs.realpathSync(newLocation);

            if (this.pathsOverlap(oldPath, newPath)) {
                return { status: false, reason: 'locations-overlap' };
            }

            sitesToMove = fs.readdirSync(oldPath).filter(site => {
                const sitePath = path.join(oldPath, site);
                return Utils.dirExists(sitePath) && this.checkIfDirectoryIsSite(sitePath);
            });

            // Refuse every collision and symbolic link before starting to copy any website.
            for (const site of sitesToMove) {
                if (fs.lstatSync(path.join(oldPath, site)).isSymbolicLink()) {
                    throw this.relocationError('Cannot relocate a symbolic link to a website: ' + site, 'website-symlink', site);
                }

                const symbolicLink = this.findSymbolicLink(path.join(oldPath, site));

                if (symbolicLink) {
                    throw this.relocationError('Cannot relocate a website containing a symbolic link: ' + symbolicLink, 'website-symlink', path.relative(oldPath, symbolicLink));
                }

                try {
                    fs.lstatSync(path.join(newPath, site));
                } catch (error) {
                    if (error.code === 'ENOENT') {
                        continue;
                    }

                    throw error;
                }

                throw this.relocationError('Website destination already exists: ' + site, 'destination-exists', site);
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
            return { status: false, reason: error.reason || null, detail: error.detail || null };
        }

        this.application.sitesDir = newLocation;
        this.application.app.sitesDir = newLocation;

        // The new location is complete and persisted. A cleanup failure must never
        // roll it back: some originals may already have been removed.
        this.removeDirectories(sitesToMove.map(site => path.join(oldLocation, site)));
        return { status: true };
    }

    relocationError(message, reason, detail) {
        const error = new Error(message);
        error.reason = reason;
        error.detail = detail;
        return error;
    }

    /**
     * Copying preserves symbolic links verbatim, so a link with a target inside
     * the relocated tree would lose its data once the originals are removed.
     */
    findSymbolicLink(directory) {
        for (const entry of fs.readdirSync(directory)) {
            const entryPath = path.join(directory, entry);
            const entryStats = fs.lstatSync(entryPath);

            if (entryStats.isSymbolicLink()) {
                return entryPath;
            }

            if (entryStats.isDirectory()) {
                const symbolicLink = this.findSymbolicLink(entryPath);

                if (symbolicLink) {
                    return symbolicLink;
                }
            }
        }

        return null;
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
     * Check a folder selected as the previews location. A subfolder is created there for every website,
     * so the folder has to be empty and separated from the sites and backups locations.
     *
     * @param location - folder selected by the user
     * @param reservedLocations - folders which cannot contain the previews location nor be placed inside of it
     * @returns {object} status; reason: previews-location-missing | previews-location-overlap | previews-location-not-empty
     */
    checkPreviewsLocation(location, reservedLocations = []) {
        if (typeof location !== 'string' || location.trim() === '' || !Utils.dirExists(location)) {
            return { status: false, reason: 'previews-location-missing' };
        }

        let realLocation;

        try {
            realLocation = fs.realpathSync(location);
        } catch (error) {
            return { status: false, reason: 'previews-location-missing' };
        }

        for (const reserved of reservedLocations) {
            if (typeof reserved !== 'string' || reserved.trim() === '') {
                continue;
            }

            if (this.pathsOverlap(realLocation, this.resolveRealPath(reserved))) {
                return { status: false, reason: 'previews-location-overlap' };
            }
        }

        // Files created by the operating system do not mean that the folder is in use
        const ignoredEntries = ['.ds_store', 'thumbs.db', 'desktop.ini'];
        const entries = fs.readdirSync(realLocation).filter(entry => !ignoredEntries.includes(entry.toLowerCase()));

        if (entries.length > 0) {
            return { status: false, reason: 'previews-location-not-empty' };
        }

        return { status: true };
    }

    /**
     * Real path of a folder which may not exist yet - links in its existing ancestors are resolved,
     * so it can be compared with real paths (i.e. the temporary directory on macOS is a link).
     */
    resolveRealPath(target) {
        let existing = path.resolve(target);
        const missingSegments = [];

        while (!Utils.dirExists(existing)) {
            const parent = path.dirname(existing);

            if (parent === existing) {
                return path.resolve(target);
            }

            missingSegments.unshift(path.basename(existing));
            existing = parent;
        }

        return path.join(fs.realpathSync(existing), ...missingSegments);
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
