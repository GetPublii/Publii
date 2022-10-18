const fs = require('fs-extra');
const path = require('path');
const tar = require('tar-fs');
const Utils = require('./../../helpers/utils.js');

class CreateFromBackup {
    constructor (appInstance, backupPath) {
        this.backupPath = backupPath;
        this.appInstance = appInstance;
        this.baseDir = path.join(this.appInstance.appDir, 'temp');
        this.tempDir = path.join(this.baseDir, 'backup-to-restore');
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
        let configContent = fs.readFileSync(configFilePath, 'utf8');
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
            fs.emptyDirSync(this.tempDir);
        }
    }
}

module.exports = CreateFromBackup;
