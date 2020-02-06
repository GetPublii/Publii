const fs = require('fs-extra');
const path = require('path');
const ipcMain = require('electron').ipcMain;
const Backup = require('../modules/backup/backup.js');
const childProcess = require('child_process');

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

    createBackup(siteName, filename, event) {
        let backupsDir = this.backupsLocation;
        let sourceDir = path.join(this.app.sitesDir, siteName);
        let backupProcess = childProcess.fork(__dirname + '/../workers/backup/create');

        backupProcess.send({
            type: 'dependencies',
            siteName: siteName,
            backupsDir: backupsDir,
            sourceDir: sourceDir,
            backupFilename: filename
        });

        backupProcess.on('message', function(data) {
            if(data.type === 'app-backup-create-success') {
                event.sender.send('app-backup-created', {
                    status: true,
                    backups: data.backups
                });
            } else {
                event.sender.send('app-backup-created', {
                    status: false
                });
            }
        });
    }

    restoreBackup(siteName, backupName, event) {
        let backupsDir = this.backupsLocation;
        let destinationDir = this.app.sitesDir;
        let tempDir = path.join(this.app.appDir, 'temp');
        let backupProcess = childProcess.fork(__dirname + '/../workers/backup/restore');

        backupProcess.send({
            type: 'dependencies',
            siteName: siteName,
            backupName: backupName,
            backupsDir: backupsDir,
            destinationDir: destinationDir,
            tempDir: tempDir
        });

        backupProcess.on('message', data => {
            if (data.type === 'app-backup-restore-success') {
                event.sender.send('app-backup-restored', {
                    status: true
                });
            } else if (data.type === 'app-backup-restore-close-db') {
                if (this.app.db) {
                    this.app.db.close();
                }
            } else {
                event.sender.send('app-backup-restored', {
                    status: false,
                    error: data.error
                });
            }
        });
    }
}

module.exports = BackupEvents;
