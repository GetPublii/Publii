const fs = require('fs-extra');
const path = require('path');
const ipcMain = require('electron').ipcMain;
const Backup = require('../modules/backup/backup.js');
const PathValidator = require('../helpers/path-validator.js');

const { isValidDirSegment, isValidFileName } = PathValidator;

class BackupEvents {
    constructor(appInstance) {
        let self = this;
        this.app = appInstance;
        this.backupsLocation = this.app.appConfig.backupsLocation;

        if (this.backupsLocation === '') {
            this.backupsLocation = path.join(this.app.appDir, 'backups');
        }

        ipcMain.on('app-backups-list-load', function (event, siteData) {
            if (siteData && isValidDirSegment(siteData.site)) {
                self.loadBackupsList(siteData.site, event);
            } else {
                event.sender.send('app-backups-list-loaded', {
                    status: false
                });
            }
        });

        ipcMain.on('app-backup-create', function(event, siteData) {
            if (siteData &&
                isValidDirSegment(siteData.site) &&
                isValidFileName(siteData.filename)) {
                self.createBackup(siteData.site, siteData.filename, event);
            } else {
                event.sender.send('app-backup-created', {
                    status: false
                });
            }
        });

        ipcMain.on('app-backup-remove', function(event, siteData) {
            if (siteData &&
                isValidDirSegment(siteData.site) &&
                Array.isArray(siteData.backupsNames) &&
                siteData.backupsNames.length > 0 &&
                siteData.backupsNames.every(isValidFileName)) {
                self.removeBackups(siteData.site, siteData.backupsNames, event);
            } else {
                event.sender.send('app-backup-removed', {
                    status: false
                });
            }
        });

        ipcMain.on('app-backup-rename', function(event, siteData) {
            if (siteData &&
                isValidDirSegment(siteData.site) &&
                isValidFileName(siteData.oldBackupName) &&
                isValidFileName(siteData.newBackupName)) {
                self.renameBackup(siteData.site, siteData.oldBackupName, siteData.newBackupName, event);
            } else {
                event.sender.send('app-backup-renamed', {
                    status: false
                });
            }
        });

        ipcMain.on('app-backup-restore', function(event, siteData) {
            if (siteData &&
                isValidDirSegment(siteData.site) &&
                isValidFileName(siteData.backupName)) {
                self.restoreBackup(siteData.site, siteData.backupName, event);
            } else {
                event.sender.send('app-backup-restored', {
                    status: false
                });
            }
        });

        ipcMain.on('app-backup-set-location', (event, newLocation) => {
            if (newLocation === '') {
                this.backupsLocation = path.join(this.app.appDir, 'backups');
                return;
            }

            if (typeof newLocation !== 'string' ||
                newLocation.indexOf('\0') !== -1 ||
                !path.isAbsolute(newLocation)) {
                return;
            }

            try {
                if (!fs.existsSync(newLocation) || !fs.statSync(newLocation).isDirectory()) {
                    return;
                }
            } catch (e) {
                return;
            }

            this.backupsLocation = newLocation;
        });
    }

    loadBackupsList(siteName, event) {
        let backups = Backup.loadList(siteName, this.backupsLocation);

        event.sender.send('app-backups-list-loaded', {
            status: true,
            backups: backups
        });
    }

    async removeBackups(siteName, backupsNames, event) {
        let result = await Backup.remove(siteName, backupsNames, this.backupsLocation);

        event.sender.send('app-backup-removed', {
            status: result.status,
            backups: result.backups
        });
    }

    renameBackup(siteName, oldBackupName, newBackupName, event) {
        let result = Backup.rename(siteName, oldBackupName, newBackupName, this.backupsLocation);

        event.sender.send('app-backup-renamed', {
            status: result.status,
            backups: result.backups
        });
    }

    async createBackup(siteName, filename, event) {
        let backupsDir = this.backupsLocation;
        let sourceDir = path.join(this.app.sitesDir, siteName);
        let backupResult = await Backup.create(siteName, filename, backupsDir, sourceDir);

        if (backupResult.type === 'app-backup-create-success') {
            event.sender.send('app-backup-created', {
                status: true,
                backups: backupResult.backups
            });
        } else {
            event.sender.send('app-backup-created', {
                status: false,
                error: backupResult.error
            });
        }
    }

    async restoreBackup(siteName, backupName, event) {
        let backupsDir = this.backupsLocation;
        let destinationDir = this.app.sitesDir;
        let tempDir;
        let backupResult;

        // Every restore gets its own temp directory, so operations started in other windows are not affected
        try {
            let baseTempDir = path.join(this.app.appDir, 'temp');
            fs.ensureDirSync(baseTempDir);
            tempDir = fs.mkdtempSync(path.join(baseTempDir, 'restore-'));
        } catch (error) {
            console.log('Unable to create a temporary directory for the backup:', error);
            event.sender.send('app-backup-restored', {
                status: false,
                error: 'core.backup.temporaryDirectoryDoesNotExists'
            });

            return;
        }

        try {
            backupResult = await Backup.restore(siteName, backupName, backupsDir, destinationDir, tempDir, this.app);
        } finally {
            // A locked leftover must not hide the result of the restore
            try {
                fs.removeSync(tempDir);
            } catch (error) {
                console.log('Unable to remove the temporary directory of the backup:', error);
            }
        }

        if (backupResult.type === 'app-backup-restore-success') {
            event.sender.send('app-backup-restored', {
                status: true
            });
        } else {
            event.sender.send('app-backup-restored', {
                status: false,
                error: backupResult.error
            });
        }
    }
}

module.exports = BackupEvents;
