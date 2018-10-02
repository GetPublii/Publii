/*
 * Class used to upload files to the SFTP server
 */

const fs = require('fs-extra');
const path = require('path');
const md5 = require('md5');
const sftpClient = require('ssh2-sftp-client');
const passwordSafeStorage = require('keytar');
const slug = require('./../../helpers/slug');
const normalizePath = require('normalize-path');

class SFTP {
    constructor(deploymentInstance = false) {
        this.deployment = deploymentInstance;
        this.connection = false;
    }

    async initConnection() {
        let self = this;
        let waitForTimeout = true;
        let ftpPassword = this.deployment.siteConfig.deployment.password;
        let passphrase = this.deployment.siteConfig.deployment.passphrase;
        let account = slug(this.deployment.siteConfig.name);

        this.connection = new sftpClient();

        if(ftpPassword === 'publii ' + account) {
            ftpPassword = await passwordSafeStorage.getPassword('publii', account);
        }

        if(passphrase === 'publii-passphrase ' + account) {
            passphrase = await passwordSafeStorage.getPassword('publii-passphrase', account);
        }

        let connectionSettings = {
            host: this.deployment.siteConfig.deployment.server,
            port: this.deployment.siteConfig.deployment.port,
            username: this.deployment.siteConfig.deployment.username
        };

        if(this.deployment.siteConfig.deployment.protocol === 'sftp') {
            connectionSettings.password = ftpPassword;
        } else {
            let keyPath = this.deployment.siteConfig.deployment.sftpkey;

            if(passphrase !== '') {
                connectionSettings.passphrase = passphrase;
            }

            connectionSettings.privateKey = fs.readFileSync(keyPath);
        }

        this.connection.connect(connectionSettings).then(() => {
            process.send({
                type: 'web-contents',
                message: 'app-uploading-progress',
                value: {
                    progress: 6,
                    operations: false
                }
            });

            process.send({
                type: 'web-contents',
                message: 'app-connection-in-progress'
            });

            waitForTimeout = false;

            process.send({
                type: 'web-contents',
                message: 'app-connection-success'
            });

            self.deployment.setInput();
            self.deployment.setOutput();
            self.deployment.prepareLocalFilesList();

            process.send({
                type: 'web-contents',
                message: 'app-uploading-progress',
                value: {
                    progress: 7,
                    operations: false
                }
            });

            self.downloadFilesList();
        }).catch(err => {
            console.log('ERR (1): ' + err);
            self.downloadFilesList();
        });

        setTimeout(function() {
            if(waitForTimeout === true) {
                self.connection.end();

                process.send({
                    type: 'web-contents',
                    message: 'app-connection-error'
                });

                setTimeout(function () {
                    process.exit();
                }, 1000);
            }
        }, 20000);
    }

    downloadFilesList() {
        let self = this;

        this.connection.get(
            normalizePath(path.join(self.deployment.outputDir, 'files.publii.json'))
        ).then(function(stream) {
            let fileStream;

            self.deployment.outputLog.push('<- files.publii.json');

            process.send({
                type: 'web-contents',
                message: 'app-uploading-progress',
                value: {
                    progress: 8,
                    operations: false
                }
            });

            let remoteFilesList = path.join(self.deployment.configDir, 'files-remote.json');
            fileStream = fs.createWriteStream(remoteFilesList);
            stream.pipe(fileStream);

            stream.on('close', function() {
                if(fs.readFileSync(remoteFilesList).length) {
                    self.deployment.compareFilesList(true);
                } else {
                    self.deployment.compareFilesList(false);
                }
            });
        }).catch(err => {
            console.log('ERR (2): ' + err + ' [<- files.publii.json]');
            self.deployment.compareFilesList(false);
        });
    }

    uploadNewFileList() {
        let self = this;

        process.send({
            type: 'web-contents',
            message: 'app-uploading-progress',
            value: {
                progress: 99,
                operations: [self.deployment.currentOperationNumber, self.deployment.operationsCounter]
            }
        });

        this.connection.put(
            normalizePath(path.join(self.deployment.inputDir, 'files.publii.json')),
            normalizePath(path.join(self.deployment.outputDir, 'files.publii.json'))
        ).then(function(err) {
            self.deployment.outputLog.push('-> files.publii.json');

            if (err) {
                self.deployment.outputLog.push(err);
            }

            self.connection.end();

            process.send({
                type: 'web-contents',
                message: 'app-uploading-progress',
                value: {
                    progress: 100,
                    operations: false
                }
            });

            process.send({
                type: 'sender',
                message: 'app-deploy-uploaded',
                value: {
                    status: true
                }
            });

            self.deployment.saveConnectionLog();

            setTimeout(function () {
                process.exit();
            }, 1000);
        }).catch(err => {
            this.connection.end();
            console.log('ERR (3): ' + err + ' [-> files.publii.json]');

            self.deployment.saveConnectionLog();

            setTimeout(function () {
                process.exit();
            }, 1000);
        });
    }

    uploadFile(input, output) {
        let self = this;

        this.connection.put(input, output).then(function (err) {
            self.deployment.currentOperationNumber++;
            self.deployment.outputLog.push('UPL ' + input + ' -> ' + output);

            if (err) {
                self.deployment.outputLog.push(err);
                self.deployment.outputLog.push('- - -ERROR UPLOAD FILE - - -');
                self.deployment.outputLog.push(normalizePath(path.join(self.outputDir, fileToUpload.path)));
                self.deployment.outputLog.push(err);
                self.deployment.outputLog.push('- - - - - - - - - - - - - - ');
            }

            self.deployment.progressOfUploading += self.deployment.progressPerFile;

            process.send({
                type: 'web-contents',
                message: 'app-uploading-progress',
                value: {
                    progress: 8 + Math.floor(self.deployment.progressOfUploading),
                    operations: [self.deployment.currentOperationNumber, self.deployment.operationsCounter]
                }
            });

            self.deployment.uploadFile();
        }).catch(err => {
            console.log('ERR (4): ' + err + ' [' + output + ']');
            self.deployment.uploadFile();
        });
    }

    uploadDirectory(input, output) {
        let self = this;

        this.connection.mkdir(output, true).then(function (err) {
            self.deployment.currentOperationNumber++;
            self.deployment.outputLog.push('UPL ' + input + ' -> ' + output);

            if (err) {
                self.deployment.outputLog.push(err);
                self.deployment.outputLog.push('- - -ERROR UPLOAD DIR - - -');
                self.deployment.outputLog.push(output);
                self.deployment.outputLog.push(err);
                self.deployment.outputLog.push('- - - - - - - - - - - - - - ');
            }

            self.deployment.progressOfUploading += self.deployment.progressPerFile;

            process.send({
                type: 'web-contents',
                message: 'app-uploading-progress',
                value: {
                    progress: 8 + Math.floor(self.deployment.progressOfUploading),
                    operations: [self.deployment.currentOperationNumber, self.deployment.operationsCounter]
                }
            });

            self.deployment.uploadFile();
        }).catch(err => {
            console.log('ERR (5): ' + err + ' [' + output + ']');
            self.deployment.uploadFile();
        });
    }

    removeFile(input) {
        let self = this;

        this.connection.delete(input).then(function (err) {
            self.deployment.currentOperationNumber++;
            self.deployment.outputLog.push('DEL ' + input);

            if (err) {
                self.deployment.outputLog.push(err);
                self.deployment.outputLog.push('- - -ERROR REMOVE FILE - - -');
                self.deployment.outputLog.push(input);
                self.deployment.outputLog.push(err);
                self.deployment.outputLog.push('- - - - - - - - - - - - - - ');
            }

            self.deployment.progressOfDeleting += self.deployment.progressPerFile;

            process.send({
                type: 'web-contents',
                message: 'app-uploading-progress',
                value: {
                    progress: 8 + Math.floor(self.deployment.progressOfDeleting),
                    operations: [self.deployment.currentOperationNumber ,self.deployment.operationsCounter]
                }
            });

            self.deployment.removeFile();
        }).catch(err => {
            console.log('ERR (6): ' + err + ' [' + input + ']');
            self.deployment.removeFile();
        });
    }

    removeDirectory(input) {
        let self = this;

        this.connection.rmdir(input, true).then(function (err) {
            self.deployment.currentOperationNumber++;
            self.deployment.outputLog.push('DEL ' + input);

            if (err) {
                self.deployment.outputLog.push(err);
                self.deployment.outputLog.push('- - -ERROR REMOVE DIR - - -');
                self.deployment.outputLog.push(input);
                self.deployment.outputLog.push(err);
                self.deployment.outputLog.push('- - - - - - - - - - - - - - ');
            }
            self.deployment.progressOfDeleting += self.deployment.progressPerFile;

            process.send({
                type: 'web-contents',
                message: 'app-uploading-progress',
                value: {
                    progress: 8 + Math.floor(self.deployment.progressOfDeleting),
                    operations: [self.deployment.currentOperationNumber, self.deployment.operationsCounter]
                }
            });

            self.deployment.removeFile();
        }).catch(err => {
            console.log('ERR (7): ' + err + ' [' + input + ']');
            self.deployment.removeFile();
        });
    }

    async testConnection(app, deploymentConfig, siteName) {
        let client = new sftpClient();
        let waitForTimeout = true;
        let ftpPassword = deploymentConfig.password;
        let passphrase = deploymentConfig.passphrase;
        let account = slug(siteName);

        if(ftpPassword === 'publii ' + account) {
            ftpPassword = await passwordSafeStorage.getPassword('publii', account);
        }

        if(passphrase === 'publii-passphrase ' + account) {
            passphrase = await passwordSafeStorage.getPassword('publii-passphrase', account);
        }

        let connectionSettings = {
            host: deploymentConfig.server,
            port: deploymentConfig.port,
            username: deploymentConfig.username
        };

        if(deploymentConfig.protocol === 'sftp') {
            connectionSettings.password = ftpPassword;
        } else {
            let keyPath = deploymentConfig.sftpkey;

            if(passphrase !== '') {
                connectionSettings.passphrase = passphrase;
            }

            connectionSettings.privateKey = fs.readFileSync(keyPath);
        }

        client.connect(connectionSettings).then(() => {
            return client.list('/');
        }).then(data => {
            client.end();
            waitForTimeout = false;
            app.mainWindow.webContents.send('app-deploy-test-success');
        }).catch(err => {
            console.log(err);

            if(waitForTimeout) {
                waitForTimeout = false;
                client.end();
                app.mainWindow.webContents.send('app-deploy-test-error');
            }
        });

        setTimeout(function() {
            if(waitForTimeout === true) {
                client.end();
                app.mainWindow.webContents.send('app-deploy-test-error');
            }
        }, 15000);
    }
}

module.exports = SFTP;
