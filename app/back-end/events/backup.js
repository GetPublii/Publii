const fs = require('fs-extra');
const path = require('path');
const ipcMain = require('electron').ipcMain;
const Backup = require('../modules/backup/backup.js');

class BackupEvents {
    constructor(appInstance) {
        let self = this;
        this.app = appInstance;
        this.backupsLocation = this.app.appConfig.backupsLocation;

        if (this.backupsLocation === '') {
            this.backupsLocation = path.join(this.app.appDir, 'backups');
        }

        ipcMain.on('app-backups-list-load', function (event, siteData) {
            if(siteData.site) {
                self.loadBackupsList(siteData.site, event);
            } else {
                event.sender.send('app-backups-list-loaded', {
                    status: false
                });
            }
        });

        ipcMain.on('app-backup-create', function(event, siteData) {
            if(siteData.site) {
                self.createBackup(siteData.site, siteData.filename, event);
            } else {
                event.sender.send('app-backup-created', {
                    status: false
                });
            }
        });

        ipcMain.on('app-backup-remove', function(event, siteData) {
            if(siteData.site && siteData.backupsNames) {
                self.removeBackups(siteData.site, siteData.backupsNames, event);
            } else {
                event.sender.send('app-backup-removed', {
                    status: false
                });
            }
        });

        ipcMain.on('app-backup-rename', function(event, siteData) {
            if(siteData.site && siteData.oldBackupName && siteData.newBackupName) {
                self.renameBackup(siteData.site, siteData.oldBackupName, siteData.newBackupName, event);
            } else {
                event.sender.send('app-backup-renamed', {
                    status: false
                });
            }
        });

        ipcMain.on('app-backup-restore', function(event, siteData) {
            if(siteData.site && siteData.backupName) {
                self.restoreBackup(siteData.site, siteData.backupName, event);
            } else {
                event.sender.send('app-backup-restored', {
                    status: false
                });
            }
        });

        ipcMain.on('app-backup-set-location', (event, newLocation) => {
            this.backupsLocation = newLocation;

            if (this.backupsLocation === '') {
                this.backupsLocation = path.join(this.app.appDir, 'backups');
            }
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
        let tempDir = path.join(this.app.appDir, 'temp');
        let backupResult = await Backup.restore(siteName, backupName, backupsDir, destinationDir, tempDir, this.app);

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
