/*
 * Class used to create backups
 */

const fs = require('fs-extra');
const path = require('path');
const FileHelper = require('./../../helpers/file.js');
const Utils = require('./../../helpers/utils.js');
const PathValidator = require('./../../helpers/path-validator.js');
const moment = require('moment');
const archiver = require('archiver');
const tar = require('tar-fs');
const { shell } = require('electron');

const { isValidDirSegment, isValidFileName, resolveValidPath } = PathValidator;

class Backup {
    /**
     * Loads list of backups
     *
     * @param siteName
     * @param backupsDir
     * @returns {*}
     */
    static loadList(siteName, backupsDir) {
        if (!isValidDirSegment(siteName)) {
            return false;
        }

        let backupsPath = resolveValidPath(backupsDir, siteName);

        if (!backupsPath) {
            return false;
        }

        if(!Utils.dirExists(backupsPath)) {
            if(Utils.dirExists(backupsDir)) {
                fs.mkdirSync(backupsPath, { recursive: true });
            } else {
                return false;
            }
        }

        let files = [];
        let allFiles = fs.readdirSync(backupsPath);
        let index = 0;

        for(let file of allFiles) {
            if(path.parse(file).ext !== '.tar') {
                continue;
            }

            let stats = fs.statSync(path.join(backupsPath, file));
            let size = Backup.convertToMegabytes(stats.size);
            let createdAt = stats.birthtime || stats.mtime;

            files.push({
                id: index,
                name: file,
                size: size,
                url: path.join(backupsPath, file),
                createdAt: Date.parse(createdAt)
            });

            index++;
        }

        files.sort((a,b) => {
            return b.createdAt - a.createdAt;
        });

        files = files.map(item => {
            item.createdAt = moment(new Date(item.createdAt)).format('MM-DD-YYYY HH:mm');

            return item;
        });

        return files;
    }

    /**
     * Creates backup
     *
     * @param siteName
     * @param backupFilename
     * @param backupsDir
     * @param sourceDir
     */
    static async create(siteName, backupFilename, backupsDir, sourceDir) {
        if (!isValidDirSegment(siteName) || typeof backupFilename !== 'string') {
            return {
                type: 'app-backup-create-error',
                status: false,
                error: 'core.backup.locationDoesNotExists'
            };
        }

        let sourcePath = path.join(sourceDir);
        let backupsPath = resolveValidPath(backupsDir, siteName);

        if (!backupsPath) {
            return {
                type: 'app-backup-create-error',
                status: false,
                error: 'core.backup.locationDoesNotExists'
            };
        }

        if(!Utils.dirExists(backupsPath)) {
            if(Utils.dirExists(backupsDir)) {
                fs.mkdirSync(backupsPath, { recursive: true });
            } else {
                return {
                    type: 'app-backup-create-error',
                    status: false,
                    error: 'core.backup.locationDoesNotExists'
                };
            }
        }

        if (Utils.dirExists(backupsPath)) {
            backupFilename = backupFilename.replace(/[^a-z0-9\-\_]/gmi, '');

            if (backupFilename.length === 0) {
                return {
                    type: 'app-backup-create-error',
                    status: false,
                    error: 'core.backup.locationDoesNotExists'
                };
            }

            let backupFile = resolveValidPath(backupsPath, backupFilename + '.tar');

            if (!backupFile) {
                return {
                    type: 'app-backup-create-error',
                    status: false,
                    error: 'core.backup.locationDoesNotExists'
                };
            }
            let createOperation = new Promise(function (resolve, reject) {
                let output = fs.createWriteStream(backupFile);
                let archive = archiver('tar');
                
                output.on('error', function (err) {
                    resolve({
                        type: 'app-backup-create-error',
                        status: false,
                        error: err
                    });
                });

                output.on('close', function () {
                    resolve({
                        type: 'app-backup-create-success',
                        backups: Backup.loadList(siteName, backupsDir)
                    });
                });

                archive.on('error', function (err) {
                    resolve({
                        type: 'app-backup-create-error',
                        status: false,
                        error: err
                    });
                });

                archive.pipe(output);
                archive.append((+new Date).toString(), { name: 'backup-date.log' });
                archive.directory(sourcePath + '/input/', 'input');
                archive.finalize();
            });

            let results = await createOperation;
            return results;
        }

        return {
            type: 'app-backup-create-error',
            status: false,
            error: 'core.backup.locationDoesNotExists'
        };
    }

    /**
     * Removes backup
     *
     * @param siteName
     * @param backupsNames
     * @param backupsDir
     * @returns {{status: boolean, backups: *}}
     */
    static async remove(siteName, backupsNames, backupsDir) {
        if (!isValidDirSegment(siteName) || !Array.isArray(backupsNames)) {
            return {
                status: false,
                backups: Backup.loadList(siteName, backupsDir)
            };
        }

        let siteBackupsDir = resolveValidPath(backupsDir, siteName);

        if (!siteBackupsDir) {
            return {
                status: false,
                backups: false
            };
        }

        for(let backupName of backupsNames) {
            if (!isValidFileName(backupName)) {
                return {
                    status: false,
                    backups: Backup.loadList(siteName, backupsDir)
                };
            }

            let backupFilePath = resolveValidPath(siteBackupsDir, backupName);

            if (!backupFilePath || !Utils.fileExists(backupFilePath)) {
                return {
                    status: false,
                    backups: Backup.loadList(siteName, backupsDir)
                };
            }

            try {
                await shell.trashItem(backupFilePath);
            } catch (e) {
                console.log('ERR:', e);
                return Promise.resolve({
                    status: false,
                    backups: Backup.loadList(siteName, backupsDir)
                });
            }
        }

        return Promise.resolve({
            status: true,
            backups: Backup.loadList(siteName, backupsDir)
        });
    }

    /**
     * Renames backup
     *
     * @param siteName
     * @param oldBackupName
     * @param newBackupName
     * @param backupsDir
     * @returns {{status: boolean, backups: *}}
     */
    static rename(siteName, oldBackupName, newBackupName, backupsDir) {
        if (!isValidDirSegment(siteName) ||
            !isValidFileName(oldBackupName) ||
            !isValidFileName(newBackupName)) {
            return {
                status: false,
                backups: Backup.loadList(siteName, backupsDir)
            };
        }

        let siteBackupsDir = resolveValidPath(backupsDir, siteName);

        if (!siteBackupsDir) {
            return {
                status: false,
                backups: false
            };
        }

        let oldBackupFilePath = resolveValidPath(siteBackupsDir, oldBackupName + '.tar');
        let newBackupFilePath = resolveValidPath(siteBackupsDir, newBackupName + '.tar');

        if (!oldBackupFilePath || !newBackupFilePath) {
            return {
                status: false,
                backups: Backup.loadList(siteName, backupsDir)
            };
        }

        if (!Utils.fileExists(oldBackupFilePath) || Utils.fileExists(newBackupFilePath)) {
            return {
                status: false,
                backups: Backup.loadList(siteName, backupsDir)
            };
        }

        try {
            fs.renameSync(oldBackupFilePath, newBackupFilePath);
        } catch (e) {
            return {
                status: false,
                backups: Backup.loadList(siteName, backupsDir)
            };
        }

        return {
            status: true,
            backups: Backup.loadList(siteName, backupsDir)
        };
    }

    /**
     * Restores backup
     *
     * @param siteName
     * @param backupName
     * @param backupsDir
     * @param destinationDir
     * @param tempDir
     */
    static async restore(siteName, backupName, backupsDir, destinationDir, tempDir, appInstance) {
        if (!isValidDirSegment(siteName) || !isValidFileName(backupName)) {
            return {
                type: 'app-backup-restore-error',
                status: false,
                error: 'core.backup.fileDoesNotExists'
            };
        }

        let siteBackupsDir = resolveValidPath(backupsDir, siteName);
        let backupFilePath = siteBackupsDir ? resolveValidPath(siteBackupsDir, backupName) : null;
        let destinationPath = resolveValidPath(destinationDir, siteName);

        if (!backupFilePath || !destinationPath) {
            return {
                type: 'app-backup-restore-error',
                status: false,
                error: 'core.backup.fileDoesNotExists'
            };
        }

        if (!Utils.fileExists(backupFilePath)) {
            return {
                type: 'app-backup-restore-error',
                status: false,
                error: 'core.backup.fileDoesNotExists'
            };
        }

        if (!Utils.dirExists(destinationDir)) {
            return {
                type: 'app-backup-restore-error',
                status: false,
                error: 'core.backup.destinationDirectoryDoesNotExists'
            };
        }

        if(!Utils.dirExists(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });

            if(!Utils.dirExists(tempDir)) {
                return {
                    type: 'app-backup-restore-error',
                    status: false,
                    error: 'core.backup.temporaryDirectoryDoesNotExists'
                };
            }
        }

        // Empty the temp directory before extracting the backups content
        fs.emptyDirSync(tempDir);

        let safeTempBase = path.resolve(tempDir);

        let restoreOperation = new Promise(function (resolve, reject) {
            fs.createReadStream(backupFilePath)
                .on('error', function(err) {
                    resolve({
                        type: 'app-backup-restore-error',
                        status: false,
                        error: 'core.backup.errorDuringReadingBackupFile'
                    });
                })
                .pipe(tar.extract(tempDir, {
                    ignore: function (resolvedEntryPath, header) {
                        let entryName = header && header.name ? header.name : '';

                        if (path.isAbsolute(entryName)) {
                            return true;
                        }

                        if (entryName.split(/[/\\]+/).some(s => s === '..')) {
                            return true;
                        }

                        if (resolvedEntryPath !== safeTempBase &&
                            !resolvedEntryPath.startsWith(safeTempBase + path.sep)) {
                            return true;
                        }

                        return false;
                    },
                    finish: () => {
                    // Verify the backup
                    let backupTest = Backup.verify(tempDir, siteName);
        
                    if(!backupTest) {    
                        resolve({
                            type: 'app-backup-restore-error',
                            status: false,
                            error: 'core.backup.errorDuringReadingBackupFile'
                        });

                        return;
                    }
        
                    // Close DB connection and remove site dir contents
                    if (appInstance.db) {
                        try {
                            appInstance.db.close();
                        } catch (e) {
                            console.log('[BACKUP RESTORE] DB already closed');
                        }
                    }
        
                    fs.emptyDirSync(destinationPath);
        
                    // Move files from the temp dir to the site dir
                    let backupContents = fs.readdirSync(tempDir);
        
                    for(let content of backupContents) {
                        fs.moveSync(
                            path.join(tempDir, content),
                            path.join(destinationPath, content)
                        );
                    }
        
                    resolve({
                        type: 'app-backup-restore-success',
                        status: true
                    });
                }}));
        });

        let results = await restoreOperation;
        return results;
    }

    /**
     * Verifies backup
     *
     * @param backupDir
     * @param siteName
     * @returns {boolean}
     */
    static verify(backupDir, siteName) {
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

        Backup.checkSiteName(siteName, configFilePath);

        return true;
    }

    /**
     *
     * Check if the site name in the config file is the same as the current site name
     *
     * if not - change the config before the backup restore
     *
     * @param siteName - name of the website to check
     * @param configFilePath - path to the temporary config file
     *
     */
    static checkSiteName(siteName, configFilePath) {
        let configContent = FileHelper.readFileSync(configFilePath);

        try {
            configContent = JSON.parse(configContent);

            if(configContent.name !== siteName) {
                configContent.name = siteName;
                fs.writeFileSync(configFilePath, JSON.stringify(configContent, null, 4));
            }
        } catch(e) {
            console.log('modules/backup.js: Wrong site.config.json file');
        }
    }

    /**
     * Converts bytes to megabytes
     *
     * @param fileSizeInBytes
     * @returns {string}
     */
    static convertToMegabytes(fileSizeInBytes) {
        return Number(fileSizeInBytes / (1024 * 1024)).toFixed(2) + ' MB';
    }
}

module.exports = Backup;
