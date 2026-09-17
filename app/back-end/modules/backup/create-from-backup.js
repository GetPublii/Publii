const fs = require('fs-extra');
const path = require('path');
const FileHelper = require('./../../helpers/file.js');
const tar = require('tar-fs');
const Utils = require('./../../helpers/utils.js');

class CreateFromBackup {
    constructor (appInstance, backupPath, webContentsId = null) {
        this.backupPath = backupPath;
        this.appInstance = appInstance;
        this.baseDir = path.join(this.appInstance.appDir, 'temp');
        this.tempDir = CreateFromBackup.getTempDir(appInstance, webContentsId);
    }

    /**
     * Every window unpacks a backup to its own directory,
     * so the same operation running in another window is not affected
     *
     * @param appInstance
     * @param webContentsId - ID of the window which restores the backup
     */
    static getTempDir (appInstance, webContentsId = null) {
        let dirName = 'backup-to-restore';

        if (Number.isInteger(webContentsId)) {
            dirName += '-' + webContentsId;
        }

        return path.join(appInstance.appDir, 'temp', dirName);
    }

    /**
     * Removes the unpacked backup of the given window
     */
    static removeTempDir (appInstance, webContentsId = null) {
        let tempDir = CreateFromBackup.getTempDir(appInstance, webContentsId);

        if (fs.existsSync(tempDir)) {
            Utils.removePathRecursively(tempDir);
        }
    }

    async prepareBackupToRestore () {
        if (!this.checkExtension()) {
            return {
                status: 'error',
                type: 'unsupported-format'
            };
        }

        return await this.unpackBackup();
    }

    checkExtension () {
        if (this.backupPath.substr(-4) === '.tar') {
            return true;
        }

        return false;
    }

    async unpackBackup () {
        this.removeBackupFilesIfNecessary();

        let extractOperation = new Promise((resolve, reject) => {
            fs.createReadStream(this.backupPath).on('error', (err) => {
                this.removeBackupFilesIfNecessary();
                resolve({
                    status: 'error',
                    type: 'unpack-error'
                });
            }).pipe(tar.extract(this.tempDir, {
                finish: () => {
                let backupTestResult = this.verifyBackup(this.tempDir);
    
                if (!backupTestResult) {
                    this.removeBackupFilesIfNecessary();
                      
                    resolve({
                        status: 'error',
                        type: 'invalid-backup-content'
                    });

                    return;
                }

                let siteNameData = this.getSiteName();

                if (!siteNameData) {
                    this.removeBackupFilesIfNecessary();

                    resolve({
                        status: 'error',
                        type: 'invalid-site-data'
                    });

                    return;
                }
    
                resolve({
                    status: 'success',
                    type: 'unpack-success',
                    data: {
                        displayName: siteNameData.displayName,
                        catalogName: siteNameData.catalogName
                    }
                });
            }}));
        });

        let results = await extractOperation;
        return results;
    }

    verifyBackup(backupDir) {
        let foundedErrors = false;
        let configFilePath = path.join(backupDir, 'input', 'config', 'site.config.json');
        let dirsToCheck = [
            path.join(backupDir, 'input'),
            path.join(backupDir, 'input', 'config'),
            path.join(backupDir, 'input', 'media'),
            path.join(backupDir, 'input', 'themes'),
        ];
        let filesToCheck = [
            path.join(backupDir, 'input', 'db.sqlite'),
            configFilePath
        ];

        for(let i = 0; i < dirsToCheck.length; i++) {
            if (!Utils.dirExists(dirsToCheck[i])) {
                foundedErrors = true;
            }
        }

        for(let i = 0; i < filesToCheck.length; i++) {
            if (!Utils.fileExists(filesToCheck[i])) {
                foundedErrors = true;
            }
        }

        // If errors were founded
        if(foundedErrors) {
            return false;
        }

        return true;
    }

    getSiteName () {
        let configFilePath = path.join(this.tempDir, 'input', 'config', 'site.config.json');
        let configContent = FileHelper.readFileSync(configFilePath, 'utf8');
        let siteNameData = false;

        try {
            let parsedConfig = JSON.parse(configContent);
            siteNameData = {
                displayName: parsedConfig.displayName,
                catalogName: parsedConfig.name
            };
        } catch (e) {
            siteNameData = false;
        }

        return siteNameData;
    }

    removeBackupFilesIfNecessary () {
        if (fs.existsSync(this.tempDir)) {
            Utils.emptyDirRecursively(this.tempDir);
        }
    }
}

module.exports = CreateFromBackup;
